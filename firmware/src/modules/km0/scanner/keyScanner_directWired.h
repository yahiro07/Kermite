#ifndef __KEY_SCANNER_DIRECT_WIRED_H__
#define __KEY_SCANNER_DIRECT_WIRED_H__

#include "km0/types.h"

void keyScanner_directWired_initialize(uint8_t numPins, const uint8_t *pins, uint8_t scanIndexBase);

void keyScanner_directWired_update(uint8_t *keyStateBitFlags);

#endif