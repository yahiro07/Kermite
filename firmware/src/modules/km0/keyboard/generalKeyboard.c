#include "generalKeyboard.h"
#include "bitOperations.h"
#include "boardIo.h"
#include "config.h"
#include "configValidator.h"
#include "configuratorServant.h"
#include "debugUart.h"
#include "dio.h"
#include "keyMatrixScanner.h"
#include "keyboardCoreLogic2.h"
#include "system.h"
#include "usbIoCore.h"
#include "utils.h"
#include "versions.h"
#include <stdio.h>

//---------------------------------------------
//definitions

#ifndef KM0_NUM_KEYSLOTS
#error KM0_NUM_KEYSLOTS is not defined
#endif

#define NumKeySlots KM0_NUM_KEYSLOTS

//#define NumKeySlotBytes Ceil(KM0_NUM_KEYSLOTS / 8)
#define NumKeySlotBytes ((KM0_NUM_KEYSLOTS + 7) >> 3)

//---------------------------------------------
//variables

static uint8_t numRows = 0;
static uint8_t numColumns = 0;
static uint8_t *rowPins;
static uint8_t *columnPins;
static uint8_t *keySlotIndexToKeyIndexMap;

//キー状態
static uint8_t keyStateFlags[NumKeySlotBytes] = { 0 };
static uint8_t nextKeyStateFlags[NumKeySlotBytes] = { 0 };

static uint8_t pressedKeyCount = 0;

static uint16_t localLayerFlags = 0;
static uint8_t localHidReport[8] = { 0 };

//メインロジックをPC側ユーティリティのLogicSimulatorに移譲するモード
static bool isSideBrainModeEnabled = false;

static bool debugUartConfigured = false;

//---------------------------------------------
//動的に変更可能なオプション
static bool optionEmitKeyStroke = true;
static bool optionEmitRealtimeEvents = true;
static bool optionAffectKeyHoldStateToLED = true;
static bool optionUseHeartbeatLED = true;

static uint8_t optionDynamicFlags = 0xFF;

static bool optionsInitialConfigShutup = false;

static void customParameterValueHandler(uint8_t slotIndex, uint8_t value) {
  if (optionsInitialConfigShutup && bit_read(optionDynamicFlags, slotIndex) == 0) {
    return;
  }
  if (slotIndex == OptionSlot_EmitKeyStroke) {
    optionEmitKeyStroke = !!value;
  } else if (slotIndex == OptionSlot_EmitRealtimeEvents) {
    optionEmitRealtimeEvents = !!value;
  } else if (slotIndex == OptionSlot_AffectKeyHoldStateToLED) {
    optionAffectKeyHoldStateToLED = !!value;
  } else if (slotIndex == OptionSlot_UseHeartBeatLED) {
    optionUseHeartbeatLED = !!value;
  }
}

void setCustomParameterDynamicFlag(uint8_t slotIndex, bool isDynamic) {
  bit_spec(optionDynamicFlags, slotIndex, isDynamic);
}

//---------------------------------------------

static void debugDumpLocalOutputState() {
  printf("HID report:[");
  for (uint16_t i = 0; i < 8; i++) {
    printf("%02X ", localHidReport[i]);
  }
  printf("], ");
  printf("layers: %02X\n", localLayerFlags);
}

//ロジック結果出力処理
static void processKeyboardCoreLogicOutput() {
  uint16_t layerFlags = keyboardCoreLogic_getLayerActiveFlags();
  uint8_t *hidReport = keyboardCoreLogic_getOutputHidReportBytes();

  bool changed = false;
  if (layerFlags != localLayerFlags) {
    if (optionEmitRealtimeEvents) {
      configuratorServant_emitRelatimeLayerEvent(layerFlags);
    }
    localLayerFlags = layerFlags;
    changed = true;
  }
  if (!utils_compareBytes(hidReport, localHidReport, 8)) {
    if (optionEmitKeyStroke) {
      usbIoCore_hidKeyboard_writeReport(hidReport);
    }
    utils_copyBytes(localHidReport, hidReport, 8);
    changed = true;
  }
  if (changed) {
    debugDumpLocalOutputState();
  }

  uint16_t assignHitResult = keyboardCoreLogic_peekAssignHitResult();
  if (assignHitResult != 0 && optionEmitRealtimeEvents) {
    configuratorServant_emitRelatimeAssignHitEvent(assignHitResult);
  }
}

//キーが押された/離されたときに呼ばれるハンドラ
static void onPhysicalKeyStateChanged(uint8_t keySlotIndex, bool isDown) {
  if (keySlotIndex >= NumKeySlots) {
    return;
  }
  uint8_t keyIndex = system_readRomByte(keySlotIndexToKeyIndexMap + keySlotIndex);
  if (keyIndex == 0xFF) {
    return;
  }
  if (isDown) {
    printf("keydown %d\n", keyIndex);
    pressedKeyCount++;
  } else {
    printf("keyup %d\n", keyIndex);
    pressedKeyCount--;
  }

  //ユーティリティにキー状態変化イベントを送信
  if (optionEmitRealtimeEvents) {
    configuratorServant_emitRealtimeKeyEvent(keyIndex, isDown);
  }

  if (!isSideBrainModeEnabled) {
    //メインロジックでキー入力を処理
    keyboardCoreLogic_issuePhysicalKeyStateChanged(keyIndex, isDown);
  }
}

static void resetKeyboardCoreLogic() {
  bool configMemoryValid = configValidator_checkDataHeader();
  if (configMemoryValid) {
    keyboardCoreLogic_initialize();
  } else {
    keyboardCoreLogic_halt();
  }
}

//ユーティリティによる設定書き込み時に呼ばれるハンドラ
static void configuratorServantStateHandler(uint8_t state) {
  if (state == ConfiguratorServantState_KeyMemoryUpdationStarted) {
    keyboardCoreLogic_halt();
  }
  if (state == ConfiguratorServentState_KeyMemoryUpdationDone) {
    resetKeyboardCoreLogic();
  }
  if (state == ConfiguratorServentState_SideBrainModeEnabled) {
    isSideBrainModeEnabled = true;
  }
  if (state == ConfiguratorServentState_SideBrainModeDisabled) {
    isSideBrainModeEnabled = false;
  }
}

//---------------------------------------------
//master

//キー状態更新処理
static void processKeyStatesUpdate() {
  for (uint8_t i = 0; i < NumKeySlotBytes; i++) {
    uint8_t byte0 = keyStateFlags[i];
    uint8_t byte1 = nextKeyStateFlags[i];
    for (uint8_t j = 0; j < 8; j++) {
      uint8_t keySlotIndex = i * 8 + j;
      if (keySlotIndex >= NumKeySlots) {
        break;
      }
      bool state0 = bit_read(byte0, j);
      bool state1 = bit_read(byte1, j);
      if (!state0 && state1) {
        onPhysicalKeyStateChanged(keySlotIndex, true);
      }
      if (state0 && !state1) {
        onPhysicalKeyStateChanged(keySlotIndex, false);
      }
    }
    keyStateFlags[i] = nextKeyStateFlags[i];
  }
}

static uint8_t serialNumberTextBuf[24];

static void keyboardEntry() {
  configValidator_initializeDataStorage();
  utils_copyBytes(serialNumberTextBuf, (uint8_t *)KERMITE_MCU_CODE, 8);
  utils_copyBytes(serialNumberTextBuf + 8, (uint8_t *)PROJECT_ID, 8);
  configuratorServant_readDeviceInstanceCode(serialNumberTextBuf + 16);
  uibioCore_internal_setSerialNumberText(serialNumberTextBuf, 24);
  usbIoCore_initialize();
  keyMatrixScanner_initialize(
      numRows, numColumns, rowPins, columnPins, nextKeyStateFlags);
  resetKeyboardCoreLogic();
  optionsInitialConfigShutup = true;
  configuratorServant_initialize(
      configuratorServantStateHandler, customParameterValueHandler);

  system_enableInterrupts();

  uint16_t cnt = 0;
  while (1) {
    cnt++;
    if (cnt % 4 == 0) {
      keyMatrixScanner_update();
      processKeyStatesUpdate();
      keyboardCoreLogic_processTicker(5);
      processKeyboardCoreLogicOutput();
      if (optionAffectKeyHoldStateToLED) {
        boardIo_writeLed2(pressedKeyCount > 0);
      }
    }
    if (optionUseHeartbeatLED) {
      if (cnt % 4000 == 0) {
        boardIo_writeLed1(true);
      }
      if (cnt % 4000 == 4) {
        boardIo_writeLed1(false);
      }
    }
    delayMs(1);
    usbIoCore_processUpdate();
    configuratorServant_processUpdate();
  }
}

//---------------------------------------------

void generalKeyboard_useIndicatorLeds(int8_t pin1, uint8_t pin2, bool invert) {
  boardIo_setupLeds(pin1, pin2, invert);
}

void generalKeyboard_useIndicatorRgbLed(int8_t pin) {
  boardIo_setupLedsRgb(pin);
}

void generalKeyboard_useDebugUart(uint32_t baud) {
  debugUart_setup(baud);
  debugUartConfigured = true;
}

void generalKeyboard_useOptionFixed(uint8_t slot, uint8_t value) {
  customParameterValueHandler(slot, value);
  setCustomParameterDynamicFlag(slot, false);
}

void generalKeyboard_useOptionDynamic(uint8_t slot) {
  setCustomParameterDynamicFlag(slot, true);
}

void generalKeyboard_setup(
    uint8_t _numRows, uint8_t _numColumns,
    const uint8_t *_rowPins, const uint8_t *_columnPins,
    const int8_t *_keySlotIndexToKeyIndexMap) {
  numRows = _numRows;
  numColumns = _numColumns;
  rowPins = (uint8_t *)_rowPins;
  columnPins = (uint8_t *)_columnPins;
  keySlotIndexToKeyIndexMap = (uint8_t *)_keySlotIndexToKeyIndexMap;
}

void generalKeyboard_start() {
  system_initializeUserProgram();
  if (!debugUartConfigured) {
    debugUart_disable();
  }
  printf("start\n");
  keyboardEntry();
}