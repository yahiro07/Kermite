#include "km0/deviceIo/dataMemory.h"
#include "km0/deviceIo/debugUart.h"
#include "km0/deviceIo/dio.h"
#include "km0/deviceIo/system.h"
#include <avr/io.h>
#include <stdio.h>

//board ProMicro
//B0: onboard LED
//D3 (TX) ---> USB UART ---> PC

void initLED0() {
  dio_setOutput(P_B0);
}

void toggleLED0() {
  dio_toggle(P_B0);
}

void debugShowBytes(char *name, uint8_t *buf, int len) {
  printf("%s:", name);
  for (int i = 0; i < len; i++) {
    printf("%02x ", buf[i]);
  }
  printf("\n");
}

void eepromDev() {
  debugUart_setup(38400);
  printf("start\n");

  uint16_t addr = 0;
  uint8_t buf[4] = { 0x12, 0x34, 0xAB, 0xCD };

#if 1
  debugShowBytes("write", buf, 4);
  dataMemory_writeBytes(addr, buf, 4);
#endif

  for (int i = 0; i < 4; i++) {
    buf[i] = 0;
  }
  debugShowBytes("cleared", buf, 4);

  dataMemory_readBytes(addr, buf, 4);

  debugShowBytes("read", buf, 4);

  initLED0();
  while (1) {
    toggleLED0();
    delayMs(1000);
  }
}

int main() {
  USBCON = 0;
  eepromDev();
  return 0;
}
