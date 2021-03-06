
#include <avr/interrupt.h>
#include <avr/io.h>
#include <stdio.h>
#include <util/delay.h>

#include "dataMemory.h"
#include "debugUart.h"
#include "digitalIo.h"
#include "km0/base/bitOperations.h"
#include "singlewire3.h"
#include "utils.h"

extern uint8_t singlewire3_debugValues[4];

//---------------------------------------------
//board IO

#define pin_LED0 P_D5 //TXLED on ProMicro
#define pin_LED1 P_B0 //RXLED on ProMicro

void initBoardIo() {
  digitalIo_setOutput(pin_LED0);
  digitalIo_setOutput(pin_LED1);
}

void outputLED0(bool val) {
  digitalIo_write(pin_LED0, !val);
}

void toggleLED0() {
  digitalIo_toggle(pin_LED0);
}

void outputLED1(bool val) {
  digitalIo_write(pin_LED1, !val);
}

void toggleLED1() {
  digitalIo_toggle(pin_LED1);
}

//---------------------------------------------
//master slave configuration

bool checkIsMaster() {
  return dataMemory_readByte(0) > 0;
}

void writeIsMaster(bool isMaster) {
  dataMemory_writeByte(0, isMaster ? 1 : 0);
}

//---------------------------------------------
//development master

#define NumMaxDataBytes 5

uint8_t txbuf[NumMaxDataBytes];
uint8_t rxbuf[NumMaxDataBytes];

uint8_t cntVal = 0;

uint16_t tryCount = 0;
uint16_t okCount = 0;

void emitDev() {
  txbuf[0] = 0xCA;
  txbuf[1] = cntVal++;
  txbuf[2] = 0x0F;
  txbuf[3] = 0x3D;
  txbuf[4] = 0x12;

  uint8_t n = 2;
  tryCount++;
  cli();
  singlewire_sendFrame(txbuf, n);
  // _delay_us(10);
  uint8_t len = singlewire_receiveFrameBlocking(rxbuf, n);
  sei();
  if (len > 0) {
    utils_debugShowBytes(rxbuf, len);
    // generalUtils_debugShowBytesDec(singlewire3_debugValues, 4);
    okCount++;
  }
}

void runAsMaster() {
  printf("run as master\n");
  singlewire_initialize();

  uint16_t cnt = 0;

  sei();
  while (1) {
    if (cnt % 2000 == 0) {
      outputLED0(true);
    }
    if (cnt % 2000 == 1) {
      outputLED0(false);
    }
    if (cnt % 1000 == 0) {
      emitDev();
    }
    if (cnt % 1000 == 100) {
      uint8_t rate = (uint32_t)okCount * 100 / tryCount;
      printf("%d/%d, %d%%\n", okCount, tryCount, rate);
    }
    _delay_ms(1);
    cnt++;
  }
}

//---------------------------------------------
//development slave

void onRecevierInterruption() {
  tryCount++;
  uint8_t len = singlewire_receiveFrameBlocking(rxbuf, NumMaxDataBytes);
  // printf("len: %d\n", len);
  if (len > 0) {
    utils_copyBytes(txbuf, rxbuf, len);
    txbuf[2] += 0x10;
    txbuf[3] += 1;
    singlewire_sendFrame(txbuf, len);
    utils_debugShowBytes(rxbuf, len);
    okCount++;
  }
  printf("len: %d\n", len);
  utils_debugShowBytesDec(singlewire3_debugValues, 4);
  // uint8_t *pDebugValues = signlewire3_getDebugValuesPtr();
  //generalUtils_debugShowBytesDec(getDebugValuesPointer(), 4);
  // generalUtils_debugShowBytesDec(singlewire3a_debugValues, 4);
}

void runAsSlave() {
  printf("run as slave\n");

  singlewire_initialize();
  singlewire_setupInterruptedReceiver(onRecevierInterruption);

  uint16_t cnt = 0;

  sei();
  while (1) {
    if (cnt % 4000 == 0) {
      outputLED0(true);
    }
    if (cnt % 4000 == 1) {
      outputLED0(false);
    }
    if (cnt % 1000 == 100) {
      uint8_t rate = (uint32_t)okCount * 100 / tryCount;
      // printf("%d/%d, %d%%\n", okCount, tryCount, rate);
    }
    _delay_ms(1);
    cnt++;
  }
}

//---------------------------------------------

void devEntry() {
  debugUart_initialize(38400);
  printf("start\n");
  initBoardIo();
  bool isMaster = checkIsMaster();
  if (isMaster) {
    runAsMaster();
  } else {
    runAsSlave();
  }
}

int main() {
  USBCON = 0;
  devEntry();
  return 0;
}