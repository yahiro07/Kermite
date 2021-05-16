#include "km0/common/bitOperations.h"
#include "km0/deviceIo/debugUart.h"
#include "km0/deviceIo/digitalIo.h"
#include "km0/deviceIo/system.h"
#include "km0/keyboard/keyScanner_encoderBasic.h"
#include <stdio.h>

//board RPi Pico
//GP25: onboard LED
//GP16, GP17 <-- Rotary Encoder 1
//GP18, GP19 <-- Rotary Encoder 2

static EncoderConfig appEncoderConfigs[] = {
  { .pin1 = GP16, .pin2 = GP17, .scanIndexBase = 0 },
  { .pin1 = GP18, .pin2 = GP19, .scanIndexBase = 2 },
};

static uint8_t keyStateBitFlags[1] = { 0 };

int main() {
  debugUart_initialize(115200);
  printf("start\n");

  digitalIo_setOutput(GP25);
  keyScanner_encoderBasic_initialize(2, appEncoderConfigs);

  int cnt = 0;
  while (true) {
    if (cnt % 4 == 0) {
      keyScanner_encoderBasic_update(keyStateBitFlags);
      for (int i = 0; i < 4; i++) {
        if (bit_read(keyStateBitFlags[0], i)) {
          digitalIo_toggle(GP25);
          printf("encoder stepped %d\n", i);
        }
      }
    }
    if (cnt % 1000 == 0) {
      digitalIo_toggle(GP25);
    }
    cnt++;
    delayMs(1);
  }
}