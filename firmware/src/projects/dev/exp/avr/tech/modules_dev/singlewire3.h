#ifndef __SINGLEWIRE3_H__
#define __SINGLEWIRE3_H__

#include "km0/types.h"

void singlewire_sendFrame(uint8_t *txbuf, uint8_t len);
uint8_t singlewire_receiveFrameBlocking(uint8_t *rxbuf, uint8_t capacity);

void singlewire_initialize();
void singlewire_setupInterruptedReceiver(void (*pReceiverCallback)(void));
void singlewire_clearInterruptedReceiver();

#endif
