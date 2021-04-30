
#include "km0/common/bitOperations.h"
#include "km0/deviceIo/boardIo.h"
#include "km0/deviceIo/debugUart.h"
#include "km0/deviceIo/dio.h"
#include "km0/deviceIo/system.h"
#include "pico_sdk/src/rp2_common/include/hardware/gpio.h"
#include <stdio.h>

//board RPi Pico
//GP25: onboard LED
//GP4 SDIO <--> PAW3204 SDIO ---> LA.ch2
//GP5 SCLK ---> PAW3204 SCLK ---> LA.ch1
//GP6 debug timing monitor ---> LA.ch0

const int pin_sdio = GP4;
const int pin_sclk = GP5;

const int pin_debug = GP6;

void initPorts() {
  dio_setOutput(pin_sclk);
  dio_write(pin_sclk, 1);

  //configure sdio as pseudo open drain
  gpio_init(pin_sdio);
  gpio_pull_up(pin_sdio);
  gpio_set_dir(pin_sdio, 0);

  dio_setOutput(pin_debug);
  dio_setHigh(pin_debug);
}

void clockHigh() {
  dio_setHigh(pin_sclk);
  // dio_write(pin_sclk, 1);
}

void clockLow() {
  dio_setLow(pin_sclk);
  // dio_write(pin_sclk, 0);
}

void signalOut(bool value) {
  gpio_set_dir(pin_sdio, !value); //drive low for 0, hi-z for 1
}

void signalHigh() {
  gpio_set_dir(pin_sdio, 0); //sdio hi-z
}

void signalLow() {
  gpio_set_dir(pin_sdio, 1); //sdio drive low
}

bool signalRead() {
  dio_read(pin_sdio);
}

void debugLow() {
  dio_setLow(pin_debug);
}

void debugHigh() {
  dio_setHigh(pin_debug);
}

void reSyncSerial() {
  clockLow();
  delayUs(1); //T_RESYNC
  clockHigh();
  delayMs(2); //T_SIWTT, 1.7ms for normal mode
  // delayMs(400); //T_SIWTT, 320ms(+-20%) for sleep2  mode
}

void writeByte(uint8_t byte) {
  for (int i = 7; i >= 0; i--) {
    uint8_t bit = bit_read(byte, i);
    clockLow();
    signalOut(bit);
    delayUs(1);
    clockHigh();
    delayUs(1);
  }
}

uint8_t readByte() {
  uint8_t data = 0;
  for (int i = 7; i >= 0; i--) {
    clockLow();
    delayUs(1);
    clockHigh();
    uint8_t bit = signalRead();
    delayUs(1);
    bit_spec(data, i, bit);
  }
  return data;
}

uint8_t readData(uint8_t addr) {
  writeByte(addr);
  signalHigh();
  delayUs(3); //T_HOLD
  return readByte();
}

void writeData(uint8_t addr, uint8_t data) {
  addr |= 0x80;
  writeByte(addr);
  writeByte(data);
}

int main() {
  debugUart_setup(115200);
  boardIo_setupLeds(GP25, GP25, false);
  initPorts();
  reSyncSerial();

  while (true) {
    boardIo_toggleLed1();
    delayMs(1000);
    debugLow();
    uint8_t res0 = readData(0x00); //Product_ID1
    uint8_t res1 = readData(0x01); //Product_ID2
    uint8_t res2 = readData(0x02); //Motion_Status
    int8_t res3 = readData(0x03);  //Delta_X
    int8_t res4 = readData(0x04);  //Delta_Y
    printf("%x %x %x %d %d\n", res0, res1, res2, res3, res4);
    debugHigh();
  }
}
