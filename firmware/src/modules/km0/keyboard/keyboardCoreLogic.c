#include "keyboardCoreLogic.h"
#include "config.h"
#include "km0/common/bitOperations.h"
#include "km0/deviceIo/dataMemory.h"
#include "storageLayout.h"
#include <stdio.h>

#ifndef KM0_KEYBOARD__NUM_SCAN_SLOTS
#error corelogic option KM0_KEYBOARD__NUM_SCAN_SLOTS is not provided.
#endif

/*
software/src/shell/services/keyboardLogic/inputLogicSimulatorD/KeyboardCoreLogicImplementation.ts
プロトタイプ/シミュレータ実装のコードを元にC言語に移植
*/

//--------------------------------------------------------------------------------
//assing memory storage

static uint8_t readStorageByte(uint16_t addr) {
  return dataMemory_readByte(addr);
}

static uint16_t readStorageWordBE(uint16_t addr) {
  uint8_t a = dataMemory_readByte(addr);
  uint8_t b = dataMemory_readByte(addr + 1);
  return a << 8 | b;
}

//--------------------------------------------------------------------------------
//hid report

enum {
  ModFlag_Ctrl = 1,
  ModFlag_Shift = 2,
  ModFlag_Alt = 4,
  ModFlag_OS = 8
};

#define NumHidReportBytes 8
#define NumHidHoldKeySlots 6

typedef struct {
  uint8_t hidReportZerosBuf[NumHidReportBytes];
  uint8_t hidReportBuf[NumHidReportBytes];
  uint8_t layerModFlags;
  uint8_t modFlags;
  uint8_t adhocModFlags;
  bool shiftCancelActive;
  uint8_t hidKeyCodes[NumHidHoldKeySlots];
  uint8_t nextKeyPos;
} HidReportState;

static HidReportState hidReportState;

static void resetHidReportState() {
  HidReportState *rs = &hidReportState;
  for (uint8_t i = 0; i < NumHidReportBytes; i++) {
    rs->hidReportZerosBuf[i] = 0;
    rs->hidReportBuf[i] = 0;
  }
  rs->layerModFlags = 0;
  rs->modFlags = 0;
  rs->adhocModFlags = 0;
  rs->shiftCancelActive = false;
  for (uint8_t i = 0; i < NumHidHoldKeySlots; i++) {
    rs->hidKeyCodes[i] = 0;
  }
  rs->nextKeyPos = 0;
}

static uint8_t *getOutputHidReport() {
  HidReportState *rs = &hidReportState;
  uint8_t modifiers = rs->layerModFlags | rs->modFlags | rs->adhocModFlags;
  if (rs->shiftCancelActive) {
    modifiers &= ~ModFlag_Shift;
  }
  rs->hidReportBuf[0] = modifiers;
  for (uint8_t i = 0; i < NumHidHoldKeySlots; i++) {
    rs->hidReportBuf[i + 2] = rs->hidKeyCodes[i];
  }
  return rs->hidReportBuf;
}

static uint8_t *getOutputHidReportZeros() {
  return hidReportState.hidReportZerosBuf;
}

static void setLayerModifiers(uint8_t modFlags) {
  hidReportState.layerModFlags |= modFlags;
}

static void clearLayerModifiers(uint8_t modFlags) {
  hidReportState.layerModFlags &= ~modFlags;
}

static void setModifiers(uint8_t modFlags) {
  hidReportState.modFlags |= modFlags;
}

static void clearModifiers(uint8_t modFlags) {
  hidReportState.modFlags &= ~modFlags;
}

static void setAdhocModifiers(uint8_t modFlags) {
  hidReportState.adhocModFlags |= modFlags;
}

static void clearAdhocModifiers(uint8_t modFlags) {
  hidReportState.adhocModFlags &= ~modFlags;
}

static uint8_t rollNextKeyPos() {
  HidReportState *rs = &hidReportState;
  for (uint8_t i = 0; i < NumHidHoldKeySlots; i++) {
    rs->nextKeyPos++;
    if (rs->nextKeyPos == NumHidHoldKeySlots) {
      rs->nextKeyPos = 0;
    }
    if (rs->hidKeyCodes[rs->nextKeyPos] == 0) {
      break;
    }
  }
  return rs->nextKeyPos;
}

static void setOutputKeyCode(uint8_t hidKeyCode) {
  uint8_t pos = rollNextKeyPos();
  hidReportState.hidKeyCodes[pos] = hidKeyCode;
}

static void clearOutputKeyCode(uint8_t hidKeyCode) {
  HidReportState *rs = &hidReportState;
  for (uint8_t i = 0; i < NumHidHoldKeySlots; i++) {
    if (rs->hidKeyCodes[i] == hidKeyCode) {
      rs->hidKeyCodes[i] = 0;
    }
  }
}

static void startShiftCancel() {
  hidReportState.shiftCancelActive = true;
}

static void endShiftCancel() {
  hidReportState.shiftCancelActive = false;
}

static uint8_t getOutputModifiers() {
  return hidReportState.hidReportBuf[0];
}

//--------------------------------------------------------------------------------
//assing memory reader

#define NumLayersMax 16
#define KeyAssignsDataHeaderLocation StorageAddr_KeyAssignsDataHeader
#define KeyAssignsDataBodyLocation StorageAddr_KeyAssignsDataBody
typedef struct {
  uint8_t numLayers;
  uint16_t assignsStartAddress;
  uint16_t assignsEndAddress;
  uint16_t layerAttributeWords[NumLayersMax];
} AssignMemoryReaderState;

static AssignMemoryReaderState assignMemoryReaderState;

static void initAssignMemoryReader() {
  AssignMemoryReaderState *rs = &assignMemoryReaderState;
  uint8_t numLayers = readStorageByte(KeyAssignsDataHeaderLocation + 8);
  uint16_t bodyLength = readStorageWordBE(KeyAssignsDataHeaderLocation + 9);
  rs->numLayers = numLayers;
  rs->assignsStartAddress = KeyAssignsDataBodyLocation + numLayers * 2;
  rs->assignsEndAddress = KeyAssignsDataBodyLocation + bodyLength;
  printf("nl:%d bl:%d\n", numLayers, bodyLength);
  for (uint8_t i = 0; i < 16; i++) {
    rs->layerAttributeWords[i] = (i < numLayers) ? readStorageWordBE(KeyAssignsDataBodyLocation + i * 2) : 0;
  }
}

static uint8_t getNumLayers() {
  return assignMemoryReaderState.numLayers;
}

static bool isLayerDefaultSchemeBlock(uint8_t layerIndex) {
  uint16_t attrWord = assignMemoryReaderState.layerAttributeWords[layerIndex];
  return ((attrWord >> 15) & 1) == 1;
}

static uint8_t getLayerAttachedModifiers(uint8_t layerIndex) {
  uint16_t attrWord = assignMemoryReaderState.layerAttributeWords[layerIndex];
  return (attrWord >> 8) & 0b1111;
}

static bool getLayerInitialActive(uint8_t layerIndex) {
  uint16_t attrWord = assignMemoryReaderState.layerAttributeWords[layerIndex];
  return ((attrWord >> 13) & 1) == 1;
}

static uint8_t getLayerExclusionGroup(uint8_t layerIndex) {
  uint16_t attrWord = assignMemoryReaderState.layerAttributeWords[layerIndex];
  return attrWord & 0b111;
}

static uint16_t getAssignsBlockAddressForKey(uint8_t targetKeyIndex) {
  uint16_t addr = assignMemoryReaderState.assignsStartAddress;
  while (addr < assignMemoryReaderState.assignsEndAddress) {
    uint16_t data = readStorageWordBE(addr);
    bool fIsAssign = ((data >> 15) & 1) > 0;
    uint8_t fBodyLength = (data >> 8) & 0x7f;
    uint8_t fKeyIndex = data & 0xff;

    if (!fIsAssign) {
      break;
    }
    if (fKeyIndex == targetKeyIndex) {
      return addr;
    }
    addr += 2;
    addr += fBodyLength;
  }
  return 0;
}

enum {
  AssignType_None = 0,
  AssignType_Single = 1,
  AssignType_Dual = 2,
  AssignType_Tri = 3,
  AssignType_Block = 4,
  AssignType_Transparent = 5,
};

static uint8_t decodeOperationWordsLength(uint8_t code) {
  uint8_t szPri = ((code >> 6) & 0b11) + 1;
  uint8_t szSec = (code >> 3) & 0b111;
  uint8_t szTer = code & 0b111;
  return szPri + szSec + szTer;
}

static void decodeOperationWordLengths(uint8_t code, uint8_t *szPri, uint8_t *szSec, uint8_t *szTer) {
  *szPri = ((code >> 6) & 0b11) + 1;
  *szSec = (code >> 3) & 0b111;
  *szTer = code & 0b111;
}

static uint16_t getAssignBlockAddressForLayer(uint16_t baseAddr, uint8_t targetLayerIndex) {
  uint8_t len = readStorageByte(baseAddr) & 0x7F;
  uint16_t addr = baseAddr + 2;
  uint16_t endPos = addr + len;
  while (addr < endPos) {
    uint8_t data = readStorageByte(addr);
    uint8_t layerIndex = data & 0b1111;
    if (layerIndex == targetLayerIndex) {
      return addr;
    }
    addr++;
    uint8_t assignType = data >> 4 & 0b111;
    uint8_t numBlockBytes = 0;
    if (
        assignType == AssignType_Single ||
        assignType == AssignType_Dual ||
        assignType == AssignType_Tri) {
      uint8_t secondByte = readStorageByte(addr);
      numBlockBytes = decodeOperationWordsLength(secondByte);
      addr++;
    }
    addr += numBlockBytes;
  }
  return 0;
}

typedef struct {
  uint8_t assignType;
  uint32_t pri;
  uint32_t sec;
  uint32_t ter;
  int8_t layerIndex;
} AssignSet;

static AssignSet assignSetRes;

static uint32_t readOperationWordVL4(uint16_t addr, uint8_t sz) {
  uint32_t word = 0;
  for (uint8_t i = 0; i < sz; i++) {
    word = (word << 8) | readStorageByte(addr++);
  }
  for (uint8_t i = 0; i < 4 - sz; i++) {
    word <<= 8;
  }
  return word;
}

static AssignSet *getAssignSetInLayer(uint8_t keyIndex, uint8_t layerIndex) {
  uint16_t addr0 = getAssignsBlockAddressForKey(keyIndex);
  if (addr0 > 0) {
    uint16_t addr1 = getAssignBlockAddressForLayer(addr0, layerIndex);
    if (addr1 > 0) {
      uint8_t entryHeaderByte = readStorageByte(addr1);
      uint8_t assignType = entryHeaderByte >> 4 & 0b111;
      bool isBlock = assignType == 4;
      bool isTrans = assignType == 5;
      if (isBlock || isTrans) {
        assignSetRes.assignType = assignType;
        assignSetRes.pri = 0;
        assignSetRes.sec = 0;
        assignSetRes.ter = 0;
        assignSetRes.layerIndex = -1;
        return &assignSetRes;
      }
      bool isDual = assignType == 2;
      bool isTriple = assignType == 3;

      uint8_t sz0, sz1, sz2;
      uint8_t secondByte = readStorageByte(addr1 + 1);
      decodeOperationWordLengths(secondByte, &sz0, &sz1, &sz2);
      uint16_t pos = addr1 + 2;

      uint32_t pri = readOperationWordVL4(pos, sz0);
      uint32_t sec =
          (isDual || isTriple) ? readOperationWordVL4(pos + sz0, sz1) : 0;
      uint32_t ter = isTriple
                         ? readOperationWordVL4(pos + sz0 + sz1, sz2)
                         : 0;
      assignSetRes.assignType = assignType;
      assignSetRes.pri = pri;
      assignSetRes.sec = sec;
      assignSetRes.ter = ter;
      assignSetRes.layerIndex = layerIndex;
      return &assignSetRes;
    }
  }
  return NULL;
}

static AssignSet *findAssignInLayerStack(uint8_t keyIndex, uint16_t layerActiveFlags) {
  for (int8_t i = 15; i >= 0; i--) {
    if ((layerActiveFlags >> i) & 1) {
      AssignSet *res = getAssignSetInLayer(keyIndex, i);
      bool isDefaultSchemeBlock = isLayerDefaultSchemeBlock(i);
      if (res && res->assignType == AssignType_Transparent) {
        continue;
      }
      if (res && res->assignType == AssignType_Block) {
        return NULL;
      }
      if (!res && isDefaultSchemeBlock) {
        return NULL;
      }
      if (res && res->assignType != AssignType_None) {
        return res;
      }
    }
  }
  return NULL;
}

//--------------------------------------------------------------------------------
//operation handlers

typedef struct {
  uint16_t layerActiveFlags;
  int8_t oneshotLayerIndex;
  int8_t oneshotCancelTick;
} LayerState;

static LayerState layerState;

static void resetLayerState() {
  layerState.layerActiveFlags = 0;
  uint8_t numLayers = getNumLayers();
  for (uint8_t i = 0; i < numLayers; i++) {
    bool initialActive = getLayerInitialActive(i);
    if (initialActive) {
      layerState.layerActiveFlags |= 1 << i;
    }
  }
  layerState.oneshotLayerIndex = -1;
  layerState.oneshotCancelTick = -1;
}

static uint16_t getLayerActiveFlags() {
  return layerState.layerActiveFlags;
}

static void layerMutations_clearExclusive(uint8_t targetExclusiveGroup, int8_t skipLayerIndex);

static bool layerMutations_isActive(uint8_t layerIndex) {
  return ((layerState.layerActiveFlags >> layerIndex) & 1) > 0;
}

static void layerMutations_turnOffSiblingLayersIfNeed(uint8_t layerIndex) {
  uint8_t targetExclusionGroup = getLayerExclusionGroup(layerIndex);
  if (targetExclusionGroup != 0) {
    layerMutations_clearExclusive(targetExclusionGroup, layerIndex);
  }
}

static void layerMutations_activate(uint8_t layerIndex) {
  if (!layerMutations_isActive(layerIndex)) {
    layerMutations_turnOffSiblingLayersIfNeed(layerIndex);
    layerState.layerActiveFlags |= 1 << layerIndex;
    // console.log(state.layerHoldFlags.map((a) => (a ? 1 : 0)).join(''));
    printf("layer on %d\n", layerIndex);
    uint8_t modifiers = getLayerAttachedModifiers(layerIndex);
    if (modifiers) {
      setLayerModifiers(modifiers);
    }
  }
}

static void layerMutations_deactivate(uint8_t layerIndex) {
  if (layerMutations_isActive(layerIndex)) {
    layerState.layerActiveFlags &= ~(1 << layerIndex);
    // console.log(state.layerHoldFlags.map((a) => (a ? 1 : 0)).join(''));
    printf("layer off %d\n", layerIndex);
    uint8_t modifiers = getLayerAttachedModifiers(layerIndex);
    if (modifiers) {
      clearLayerModifiers(modifiers);
    }
  }
}

static void layerMutations_toggle(uint8_t layerIndex) {
  !layerMutations_isActive(layerIndex)
      ? layerMutations_activate(layerIndex)
      : layerMutations_deactivate(layerIndex);
}

static void layerMutations_oneshot(uint8_t layerIndex) {
  LayerState *ls = &layerState;
  layerMutations_activate(layerIndex);
  ls->oneshotLayerIndex = layerIndex;
  ls->oneshotCancelTick = -1;
  printf("oneshot\n");
}

static void layerMutations_clearOneshot() {
  LayerState *ls = &layerState;
  if (ls->oneshotLayerIndex != -1 && ls->oneshotCancelTick == -1) {
    ls->oneshotCancelTick = 0;
  }
}

static void layerMutations_oneshotCancellerTicker(uint16_t ms) {
  LayerState *ls = &layerState;
  if (ls->oneshotLayerIndex != -1 && ls->oneshotCancelTick >= 0) {
    ls->oneshotCancelTick += ms;
    if (ls->oneshotCancelTick > 50) {
      printf("cancel oneshot\n");
      layerMutations_deactivate(ls->oneshotLayerIndex);
      ls->oneshotLayerIndex = -1;
      ls->oneshotCancelTick = -1;
    }
  }
}

static void layerMutations_clearExclusive(uint8_t targetExclusiveGroup, int8_t skipLayerIndex) {
  uint8_t numLayers = getNumLayers();
  for (uint8_t i = 0; i < numLayers; i++) {
    if (i == skipLayerIndex) {
      continue;
    }
    uint8_t groupIndex = getLayerExclusionGroup(i);
    bool inGroup = groupIndex == targetExclusiveGroup;
    if (inGroup) {
      layerMutations_deactivate(i);
    }
  }
}

static void layerMutations_recoverMainLayerIfAllLayeresDisabled() {
  bool isAllOff = layerState.layerActiveFlags == 0;
  if (isAllOff) {
    layerMutations_activate(0);
  }
}

enum {
  OpType_KeyInput = 1,
  OpType_LayerCall = 2,
  OpType_ExtendedOperation = 3,
};

enum {
  ExOpType_LayerClearExclusive = 1,
  ExOpType_MovePointerMovement = 2,
  ExOpType_CustomCommand = 3,
};

enum {
  InvocationMode_Hold = 1,
  InvocationMode_TurnOn = 2,
  InvocationMode_TurnOff = 3,
  InvocationMode_Toggle = 4,
  InvocationMode_Oneshot = 5,
};

static void handleOperationOn(uint32_t opWord) {
  uint8_t opType = (opWord >> 30) & 0b11;
  if (opType == OpType_KeyInput) {
    opWord >>= 16;
    uint16_t hidKey = opWord & 0x3ff;
    uint8_t modFlags = (opWord >> 10) & 0b1111;
    if (modFlags) {
      setModifiers(modFlags);
    }
    if (hidKey) {
      uint8_t keyCode = hidKey & 0xff;
      bool shiftOn = hidKey & 0x100;
      bool shiftCancel = hidKey & 0x200;

      uint8_t outputModifiers = getOutputModifiers();
      bool isOtherModifiersClean = (outputModifiers & 0b1101) == 0;
      if (shiftOn) {
        setAdhocModifiers(ModFlag_Shift);
      }
      if (shiftCancel && isOtherModifiersClean) {
        startShiftCancel();
      }
      if (keyCode) {
        setOutputKeyCode(keyCode);
      }
    }
  }
  if (opType == OpType_LayerCall) {
    opWord >>= 16;
    uint8_t layerIndex = (opWord >> 8) & 0b1111;
    uint8_t fInvocationMode = (opWord >> 4) & 0b1111;

    if (fInvocationMode == InvocationMode_Hold) {
      layerMutations_activate(layerIndex);
    } else if (fInvocationMode == InvocationMode_TurnOn) {
      layerMutations_activate(layerIndex);
    } else if (fInvocationMode == InvocationMode_TurnOff) {
      layerMutations_deactivate(layerIndex);
    } else if (fInvocationMode == InvocationMode_Toggle) {
      layerMutations_toggle(layerIndex);
    } else if (fInvocationMode == InvocationMode_Oneshot) {
      layerMutations_oneshot(layerIndex);
    }
  }
  if (opType == OpType_ExtendedOperation) {
    uint8_t exOpType = (opWord >> 24) & 0b111;
    if (exOpType == ExOpType_LayerClearExclusive) {
      opWord >>= 16;
      uint8_t targetGroup = opWord & 0b111;
      layerMutations_clearExclusive(targetGroup, -1);
    }
  }

  if (opType != OpType_LayerCall) {
    layerMutations_clearOneshot();
  }
  layerMutations_recoverMainLayerIfAllLayeresDisabled();
}

static void handleOperationOff(uint32_t opWord) {
  uint8_t opType = (opWord >> 30) & 0b11;
  if (opType == OpType_KeyInput) {
    opWord >>= 16;
    uint16_t hidKey = opWord & 0x3ff;
    uint8_t modFlags = (opWord >> 10) & 0b1111;
    if (modFlags) {
      clearModifiers(modFlags);
    }
    if (hidKey) {
      uint8_t keyCode = hidKey & 0xff;
      bool shiftOn = hidKey & 0x100;
      bool shiftCancel = hidKey & 0x200;
      if (shiftOn) {
        clearAdhocModifiers(ModFlag_Shift);
      }
      if (shiftCancel) {
        endShiftCancel();
      }
      if (keyCode) {
        clearOutputKeyCode(keyCode);
      }
    }
  }
  if (opType == OpType_LayerCall) {
    opWord >>= 16;
    uint8_t layerIndex = (opWord >> 8) & 0b1111;
    uint8_t fInvocationMode = (opWord >> 4) & 0b1111;
    if (fInvocationMode == InvocationMode_Hold) {
      layerMutations_deactivate(layerIndex);
    }
  }
  layerMutations_recoverMainLayerIfAllLayeresDisabled();
}

//--------------------------------------------------------------------------------
//assign binder

#define KIDX_NONE 255

#define NumKeySlotsMax KM0_KEYBOARD__NUM_SCAN_SLOTS
#define NumRecallKeyEntries 4
#define ImmediateReleaseStrokeDuration 50

typedef struct {
  uint8_t keyIndex;
  uint8_t tick;
} RecallKeyEntry;

typedef struct {
  uint32_t keyAttachedOperationWords[NumKeySlotsMax];
  RecallKeyEntry recallKeyEntries[NumRecallKeyEntries];
} AssignBinderState;

static AssignBinderState assignBinderState;

static void resetAssignBinder() {
  for (uint8_t i = 0; i < NumKeySlotsMax; i++) {
    assignBinderState.keyAttachedOperationWords[i] = 0;
  }
  for (uint8_t i = 0; i < NumRecallKeyEntries; i++) {
    RecallKeyEntry *ke = &assignBinderState.recallKeyEntries[i];
    ke->keyIndex = KIDX_NONE;
    ke->tick = 0;
  }
}

static void assignBinder_handleKeyOn(uint8_t keyIndex, uint32_t opWord) {
  //printf("handleKeyOn %d %d\n", keyIndex, opWord);
  handleOperationOn(opWord);
  assignBinderState.keyAttachedOperationWords[keyIndex] = opWord;
}

static void assignBinder_handleKeyOff(uint8_t keyIndex) {
  uint32_t opWord = assignBinderState.keyAttachedOperationWords[keyIndex];
  if (opWord) {
    //printf("handleKeyOff %d\n", keyIndex);
    handleOperationOff(opWord);
    assignBinderState.keyAttachedOperationWords[keyIndex] = 0;
  }
}

static void assignBinder_recallKeyOff(uint8_t keyIndex) {
  for (uint8_t i = 0; i < NumRecallKeyEntries; i++) {
    RecallKeyEntry *ke = &assignBinderState.recallKeyEntries[i];
    if (ke->keyIndex == KIDX_NONE) {
      //printf("reserve recall %d\n", keyIndex);
      ke->keyIndex = keyIndex;
      ke->tick = 0;
      break;
    }
  }
}

static void assignBinder_ticker(uint8_t ms) {
  for (uint8_t i = 0; i < NumRecallKeyEntries; i++) {
    RecallKeyEntry *ke = &assignBinderState.recallKeyEntries[i];
    if (ke->keyIndex != KIDX_NONE) {
      ke->tick += ms;
      if (ke->tick > ImmediateReleaseStrokeDuration) {
        //printf("exec recall %d\n", ke->keyIndex);
        assignBinder_handleKeyOff(ke->keyIndex);
        ke->keyIndex = KIDX_NONE;
      }
    }
  }
}

//--------------------------------------------------------------------------------
//resolver common

#define TH 200

static const bool DebugShowTrigger = false;
// static const bool DebugShowTrigger = true;

enum {
  InputEdge_None = 0,
  InputEdge_Down = 1,
  InputEdge_Up = 2
};

enum {
  AssignOrder_Pri = 1,
  AssignOrder_Sec = 2,
  AssignOrder_Ter = 3
};

enum {
  Step_D = 0b01,
  Step_U = 0b10,
  Step_W = 0b11,

  Steps_D = 0b01,
  Steps_DU = 0b0110,
  Steps_D_ = 0b0111,
  Steps_DUD = 0b011001,
  Steps_U = 0b10,
  Steps_DU_ = 0b011011,
  Steps_DUD_ = 0b01100111,
  Steps_DUDU = 0b01100110,
};

// 10bytes/key
typedef struct _KeySlot {
  uint8_t keyIndex;
  uint8_t steps;
  uint16_t tick;
  int8_t liveLayerIndex;
  uint16_t liveLayerStateFlags;
  bool (*resolverProc)(struct _KeySlot *slot); //2bytes for AVR
  bool hold : 1;
  bool nextHold : 1;
  bool interrupted : 1;
  bool resolving : 1;
  uint8_t inputEdge : 2;
} KeySlot;

typedef struct {
  uint8_t interruptKeyIndex;
  KeySlot keySlots[NumKeySlotsMax];
  uint16_t assignHitResultWord;
} ResolverState;

static ResolverState resolverState;

static void initResolverState() {
  resolverState.interruptKeyIndex = KIDX_NONE;
  resolverState.assignHitResultWord = 0;
  for (uint8_t i = 0; i < NumKeySlotsMax; i++) {
    KeySlot *slot = &resolverState.keySlots[i];
    slot->keyIndex = i;
    slot->steps = 0;
    slot->hold = false;
    slot->nextHold = false;
    slot->tick = 0;
    slot->interrupted = false;
    slot->resolving = false;
    slot->liveLayerIndex = -1;
    slot->liveLayerStateFlags = 0;
    slot->resolverProc = NULL;
    slot->inputEdge = 0;
    slot->tick = 0;
  }
}

static uint16_t peekAssignHitResult() {
  if (resolverState.assignHitResultWord != 0) {
    uint16_t res = resolverState.assignHitResultWord;
    resolverState.assignHitResultWord = 0;
    return res;
  }
  return 0;
}

static void keySlot_storeAssignHitResult(
    KeySlot *slot,
    uint8_t assignOrder) {
  uint8_t fKeyIndex = slot->keyIndex;
  uint8_t fLayerIndex = slot->liveLayerIndex;
  uint8_t fSlotSpec = assignOrder;
  resolverState.assignHitResultWord =
      (1 << 15) | (fSlotSpec << 12) | (fLayerIndex << 8) | fKeyIndex;
}

static void keySlot_handleKeyOn(KeySlot *slot, uint8_t order) {
  AssignSet *pAssignSet = findAssignInLayerStack(slot->keyIndex, slot->liveLayerStateFlags);
  if (pAssignSet != NULL) {
    if (order == AssignOrder_Pri) {
      assignBinder_handleKeyOn(slot->keyIndex, pAssignSet->pri);
    } else if (order == AssignOrder_Sec) {
      assignBinder_handleKeyOn(slot->keyIndex, pAssignSet->sec);
    } else if (order == AssignOrder_Ter) {
      assignBinder_handleKeyOn(slot->keyIndex, pAssignSet->ter);
    }
  }
}

static void keySlot_handleKeyOff(KeySlot *slot) {
  assignBinder_handleKeyOff(slot->keyIndex);
}

static void keySlot_clearSteps(KeySlot *slot) {
  slot->steps = 0;
}

static void keySlot_addStep(KeySlot *slot, uint8_t step) {
  slot->steps = (slot->steps << 2) | step;
}

//--------------------------------------------------------------------------------
//resolver dummy

static bool keySlot_dummyResolver(KeySlot *slot) {
  if (slot->inputEdge == InputEdge_Up) {
    return true;
  }
  return false;
}

//--------------------------------------------------------------------------------
//resolver single

enum {
  TriggerA_Down = Steps_D,
  TriggerA_Up = Steps_U
};

static void keySlot_pushStepA(KeySlot *slot, uint8_t step) {
  keySlot_addStep(slot, step);

  uint8_t steps = slot->steps;

  if (steps == TriggerA_Down) {
    keySlot_handleKeyOn(slot, AssignOrder_Pri);
    keySlot_storeAssignHitResult(slot, AssignOrder_Pri);
  }

  if (steps == TriggerA_Up) {
    keySlot_handleKeyOff(slot);
  }
}

static bool keySlot_singleResolverA(KeySlot *slot) {
  uint8_t inputEdge = slot->inputEdge;

  if (inputEdge == InputEdge_Down) {
    keySlot_clearSteps(slot);
    keySlot_pushStepA(slot, Step_D);
  }
  if (inputEdge == InputEdge_Up) {
    keySlot_clearSteps(slot);
    keySlot_pushStepA(slot, Step_U);
    return true;
  }
  return false;
}

//--------------------------------------------------------------------------------
//resolver dual

enum {
  TriggerB_Down = Steps_D,
  TriggerB_Tap = Steps_DU,
  TriggerB_Hold = Steps_D_,
  TriggerB_Rehold = Steps_DUD,
  TriggerB_Up = Steps_U
};

static void keySlot_pushStepB(KeySlot *slot, uint8_t step) {
  keySlot_addStep(slot, step);
  slot->tick = 0;

  uint8_t steps = slot->steps;

  if (steps == TriggerB_Down) {
  }

  if (steps == TriggerB_Tap) {
    keySlot_handleKeyOn(slot, AssignOrder_Pri);
    assignBinder_recallKeyOff(slot->keyIndex);
    keySlot_storeAssignHitResult(slot, AssignOrder_Pri);
  }

  if (steps == TriggerB_Hold) {
    keySlot_handleKeyOn(slot, AssignOrder_Sec);
    keySlot_storeAssignHitResult(slot, AssignOrder_Sec);
  }

  if (steps == TriggerB_Rehold) {
    keySlot_handleKeyOn(slot, AssignOrder_Pri);
  }

  if (steps == TriggerB_Up) {
    keySlot_handleKeyOff(slot);
  }
}

static bool keySlot_dualResolverB(KeySlot *slot) {
  uint8_t inputEdge = slot->inputEdge;
  uint8_t steps = slot->steps;
  uint16_t tick = slot->tick;
  bool hold = slot->hold;
  bool interrupted = slot->interrupted;

  if (inputEdge == InputEdge_Down) {
    if (steps == Steps_DU && tick < TH) {
      //tap-rehold
      keySlot_pushStepB(slot, Step_D);
    } else {
      //down
      keySlot_clearSteps(slot);
      keySlot_pushStepB(slot, Step_D);
    }
  }

  if (steps == Steps_D && hold && tick >= TH) {
    //hold
    keySlot_pushStepB(slot, Step_W);
  }

  if (steps == Steps_D && hold && tick < TH && interrupted) {
    //interrupt hold
    keySlot_pushStepB(slot, Step_W);
  }

  if (steps == Steps_DU && !hold && tick >= TH) {
    //silent after tap
    keySlot_pushStepB(slot, Step_W);
    return true;
  }

  if (inputEdge == InputEdge_Up) {
    if (steps == Steps_D && tick < TH) {
      //tap
      keySlot_pushStepB(slot, Step_U);
    }
    if (steps == Steps_D_ || steps == Steps_DUD) {
      //hold up, rehold up
      keySlot_clearSteps(slot);
      keySlot_pushStepB(slot, Step_U);
      return true;
    }
  }
  return false;
}

//--------------------------------------------------------------------------------
//resolver triple

enum {
  TriggerC_Down = Steps_D,
  TriggerC_Hold = Steps_D_,
  TriggerC_Tap = Steps_DU_,
  TriggerC_Hold2 = Steps_DUD_,
  TriggerC_Tap2 = Steps_DUDU,
  TriggerC_Up = Steps_U
};

static void keySlot_pushStepC(KeySlot *slot, uint8_t step) {
  keySlot_addStep(slot, step);
  slot->tick = 0;

  uint8_t steps = slot->steps;

  if (steps == TriggerC_Down) {
  }

  if (steps == TriggerC_Tap) {
    keySlot_handleKeyOn(slot, AssignOrder_Pri);
    assignBinder_recallKeyOff(slot->keyIndex);
    keySlot_storeAssignHitResult(slot, AssignOrder_Pri);
  }

  if (steps == TriggerC_Hold) {
    keySlot_handleKeyOn(slot, AssignOrder_Sec);
    keySlot_storeAssignHitResult(slot, AssignOrder_Sec);
  }

  if (steps == TriggerC_Hold2) {
    keySlot_handleKeyOn(slot, AssignOrder_Pri);
  }

  if (steps == TriggerC_Tap2) {
    keySlot_handleKeyOn(slot, AssignOrder_Ter);
    assignBinder_recallKeyOff(slot->keyIndex);
    keySlot_storeAssignHitResult(slot, AssignOrder_Ter);
  }

  if (steps == TriggerC_Up) {
    keySlot_handleKeyOff(slot);
  }
}

static bool keySlot_tripleResolverC(KeySlot *slot) {
  uint8_t inputEdge = slot->inputEdge;
  uint8_t steps = slot->steps;
  uint16_t tick = slot->tick;
  bool hold = slot->hold;
  bool interrupted = slot->interrupted;

  if (inputEdge == InputEdge_Down) {
    if (steps == Steps_DU && tick < TH) {
      //down2
      keySlot_pushStepC(slot, Step_D);
    } else {
      //down
      keySlot_clearSteps(slot);
      keySlot_pushStepC(slot, Step_D);
    }
  }

  if (steps == Steps_D && hold && tick >= TH) {
    //hold
    keySlot_pushStepC(slot, Step_W);
  }

  if (steps == Steps_D && hold && tick < TH && interrupted) {
    //interrupt hold
    keySlot_pushStepC(slot, Step_W);
  }

  if (steps == Steps_DUD && hold && tick >= TH) {
    //hold2
    keySlot_pushStepC(slot, Step_W);
  }

  if (steps == Steps_DU && !hold && tick >= TH) {
    //silent after single tap
    keySlot_pushStepC(slot, Step_W);
    return true;
  }

  if (inputEdge == InputEdge_Up) {
    if (steps == Steps_DUD && tick < TH) {
      //double tap
      keySlot_pushStepC(slot, Step_U);
      return true;
    } else if (steps == Steps_D && tick < TH) {
      //single stap
      keySlot_pushStepC(slot, Step_U);
    } else {
      //up
      keySlot_clearSteps(slot);
      keySlot_pushStepC(slot, Step_U);
      return true;
    }
  }
  return false;
}

//--------------------------------------------------------------------------------
//resolver root

static bool (*keySlotResolverFuncs[4])(KeySlot *slot) = {
  keySlot_dummyResolver,
  keySlot_singleResolverA,
  keySlot_dualResolverB,
  keySlot_tripleResolverC
};

static void keySlot_tick(KeySlot *slot, uint8_t ms) {
  slot->tick += ms;

  slot->inputEdge = InputEdge_None;
  if (!slot->hold && slot->nextHold) {
    slot->hold = true;
    slot->inputEdge = InputEdge_Down;
  }
  if (slot->hold && !slot->nextHold) {
    slot->hold = false;
    slot->inputEdge = InputEdge_Up;
  }

  ResolverState *rs = &resolverState;
  slot->interrupted = rs->interruptKeyIndex != KIDX_NONE && rs->interruptKeyIndex != slot->keyIndex;

  if (!slot->resolverProc && slot->inputEdge == InputEdge_Down) {
    uint16_t layerActiveFlags = getLayerActiveFlags();
    AssignSet *pAssignSet = findAssignInLayerStack(slot->keyIndex, layerActiveFlags);
    if (pAssignSet != NULL) {
      slot->liveLayerIndex = pAssignSet->layerIndex;
      slot->liveLayerStateFlags = layerActiveFlags;
      slot->resolverProc = keySlotResolverFuncs[pAssignSet->assignType];
      if (DebugShowTrigger) {
        printf("resolver attached %d %d\n", slot->keyIndex, pAssignSet->assignType);
      }
    }
  }

  if (slot->resolverProc) {
    bool done = slot->resolverProc(slot);
    if (done) {
      slot->liveLayerStateFlags = -1;
      slot->liveLayerStateFlags = 0;
      slot->resolverProc = NULL;
      if (DebugShowTrigger) {
        printf("resolver detached %d\n", slot->keyIndex);
      }
    }
  }
}

static void triggerResolver_tick(uint8_t ms) {
  ResolverState *rs = &resolverState;
  for (uint8_t i = 0; i < NumKeySlotsMax; i++) {
    if (i != rs->interruptKeyIndex) {
      KeySlot *slot = &rs->keySlots[i];
      keySlot_tick(slot, ms);
    }
  }
  if (rs->interruptKeyIndex != KIDX_NONE) {
    KeySlot *slot = &rs->keySlots[rs->interruptKeyIndex];
    keySlot_tick(slot, ms);
  }
  rs->interruptKeyIndex = KIDX_NONE;
}

static void triggerResolver_handleKeyInput(uint8_t keyIndex, bool isDown) {
  if (keyIndex >= NumKeySlotsMax) {
    return;
  }
  ResolverState *rs = &resolverState;

  KeySlot *slot = &rs->keySlots[keyIndex];
  if (isDown) {
    rs->interruptKeyIndex = keyIndex;
    slot->nextHold = true;
    //printf("corelogic, down %d\n", keyIndex);
  } else {
    slot->nextHold = false;
    //printf("corelogic, up %d\n", keyIndex);
  }
}

//--------------------------------------------------------------------------------
//exports

static bool logicActive = false;

void keyboardCoreLogic_initialize() {
  initAssignMemoryReader();
  resetHidReportState();
  resetLayerState();
  resetAssignBinder();
  initResolverState();
  logicActive = true;
}

uint8_t *keyboardCoreLogic_getOutputHidReportBytes() {
  if (logicActive) {
    return getOutputHidReport();
  } else {
    return getOutputHidReportZeros();
  }
}

uint16_t keyboardCoreLogic_getLayerActiveFlags() {
  if (logicActive) {
    return getLayerActiveFlags();
  } else {
    return 0;
  }
}

uint16_t keyboardCoreLogic_peekAssignHitResult() {
  if (logicActive) {
    return peekAssignHitResult();
  } else {
    return 0;
  }
}

void keyboardCoreLogic_issuePhysicalKeyStateChanged(uint8_t keyIndex, bool isDown) {
  if (logicActive) {
    triggerResolver_handleKeyInput(keyIndex, isDown);
  }
}

void keyboardCoreLogic_processTicker(uint8_t ms) {
  if (logicActive) {
    triggerResolver_tick(ms);
    assignBinder_ticker(ms);
    layerMutations_oneshotCancellerTicker(ms);
  }
}

void keyboardCoreLogic_halt() {
  logicActive = false;
}
