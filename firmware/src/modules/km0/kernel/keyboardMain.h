#ifndef __KEYBOARD_MAIN_H__
#define __KEYBOARD_MAIN_H__

#include "km0/types.h"

void keyboardMain_useKeyScanner(void (*_keyScannerUpdateFunc)(uint8_t *keyStateBitFlags));
void keyboardMain_useKeyScannerExtra(void (*_keyScannerUpdateFunc)(uint8_t *keyStateBitFlags));
void keyboardMain_setKeyIndexTable(const __flash int8_t *_scanIndexToKeyIndexMap);
void keyboardMain_useDisplayModule(void (*_displayModuleUpdateFunc)(void));

#endif