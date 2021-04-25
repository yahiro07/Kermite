#ifndef __GENERAL_KEYBOARD_H__

#include "km0/types.h"

enum {
  OptionSlot_EmitKeyStroke = 0,
  OptionSlot_EmitRealtimeEvents = 1,
  OptionSlot_AffectKeyHoldStateToLED = 2,
  OptionSlot_UseHeartBeatLED = 3,
};

typedef struct _KeyboardCallbackSet {
  void (*customParameterHandlerOverride)(uint8_t slotIndex, uint8_t value);
  void (*customParameterHandlerChained)(uint8_t slotIndex, uint8_t value);
  // void (*customCommandHandler)(uint8_t commandIndex);
  void (*layerStateChanged)(uint16_t layerStateFlags);
  void (*keyStateChanged)(uint8_t keyIndex, bool isDown);
} KeyboardCallbackSet;

void generalKeyboard_useIndicatorLeds(int8_t pin1, uint8_t pin2, bool invert);
void generalKeyboard_useIndicatorRgbLed(int8_t pin);
void generalKeyboard_useDebugUart(uint32_t baud);
void generalKeyboard_useOptionFixed(uint8_t slot, uint8_t value);
void generalKeyboard_useOptionDynamic(uint8_t slot);

void generalKeyboard_useMatrixKeyScanner(
    uint8_t numRows,
    uint8_t numColumns,
    const uint8_t *rowPins,
    const uint8_t *columnPins,
    const int8_t *keySlotIndexToKeyIndexMap);

void generalKeyboard_useDirectWiredKeyScanner(
    uint8_t numKeys,
    const uint8_t *pins,
    const int8_t *keySlotIndexToKeyIndexMap);

void generalKeyboard_setCallbacks(KeyboardCallbackSet *callbacks);

void generalKeyboard_start();

#endif