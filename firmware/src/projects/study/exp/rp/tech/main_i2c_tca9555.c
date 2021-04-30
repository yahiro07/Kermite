#include "hardware/i2c.h"
#include "km0/base/bitOperations.h"
#include "km0/device/boardIo.h"
#include "km0/device/debugUart.h"
#include "km0/device/digitalIo.h"
#include "km0/device/system.h"
#include "pico/stdlib.h"
#include <stdio.h>

//board RPi Pico
//GP25: onboard LED
//GP4 I2C0_SDA <--> TCA9555 SDA
//GP5 I2C0_SCL ---> TCA9555 SCL

//TCA9555
//SDA <---> RPi Pico GP4
//SCL <---- RPi Pico GP5
//A0 <--- GND
//A1 <--- GND
//A2 <--- VDD
//P00 ---> LED -- R -- GND
//P01 ---> LED -- R -- GND
//P17 <--- Button -- GND

//----------------------------------------------------------------------

void boardI2c_initialize(uint32_t freqInHz);

//slaveAddress: I2Cスレーブのアドレス, 7ビットで指定
void boardI2c_write(uint8_t slaveAddress, uint8_t *buf, int len);
void boardI2c_read(uint8_t slaveAddress, uint8_t *buf, int len);

//----------------------------------------------------------------------

static struct i2c_inst *i2c_instance = i2c0;

static const uint8_t pin_sda = 4;
static const uint8_t pin_scl = 5;

void boardI2c_initialize(uint32_t freqInHz) {
  i2c_init(i2c_instance, freqInHz);
  gpio_set_function(pin_sda, GPIO_FUNC_I2C);
  gpio_set_function(pin_scl, GPIO_FUNC_I2C);
  gpio_pull_up(pin_sda);
  gpio_pull_up(pin_scl);
}

void boardI2c_write(uint8_t slaveAddress, uint8_t *buf, int len) {
  i2c_write_blocking(i2c_instance, slaveAddress, buf, len, false);
}

void boardI2c_read(uint8_t slaveAddress, uint8_t *buf, int len) {
  i2c_read_blocking(i2c_instance, slaveAddress, buf, len, false);
}

//----------------------------------------------------------------------

/*
TCA9555(16ch I2C IOエキスパンダ) のドライバ
スレーブアドレスは7ビットで指定, 0x0100XXX
入出力で受け渡す16ビットの値に対応するピンは、
value: [bit15, bit14, ..., bit8, bit7, ..., bit1, bit0]
port : [  P17,   P16, ...,  P10,  P07, ...,  P01,  P00]
*/

//P17~P10,P07~P00のポート方向を設定
//各ビット 1:入力(プルアップ付き, デフォルト), 0:出力
void iox_configure_ports(uint8_t slaveAddress, uint16_t val);

//P17~P10,P07~P00に値を出力
void iox_output(uint8_t slaveAddress, uint16_t val);

//P17~P10,P07~P00から値を入力
uint16_t iox_input(uint8_t slaveAddress);

//----------------------------------------------------------------------

enum {
  IoxRegisters_InputPort0 = 0,
  IoxRegisters_InputPort1,
  IoxRegisters_OutputPort0,
  IoxRegisters_OutputPort1,
  IoxRegisters_PolarityInversionPort0,
  IoxRegisters_PolarityInversionPort1,
  IoxRegisters_ConfigurationPort0,
  IoxRegisters_ConfigurationPort1
};

static void iox_write16(uint8_t slaveAddress, uint8_t addr, uint16_t val) {
  static uint8_t txbuf[3];
  txbuf[0] = addr;
  txbuf[1] = val & 0xFF;
  txbuf[2] = val >> 8 & 0xFF;
  boardI2c_write(slaveAddress, txbuf, 3);
}

static uint16_t iox_read16(uint8_t slaveAddress, uint8_t addr) {
  static uint8_t txbuf[1];
  static uint8_t rxbuf[2];
  txbuf[0] = addr;
  boardI2c_write(slaveAddress, txbuf, 1);
  boardI2c_read(slaveAddress, rxbuf, 2);
  return ((uint16_t)rxbuf[1] << 8) | rxbuf[0];
}

void iox_configure_ports(uint8_t slaveAddress, uint16_t val) {
  iox_write16(slaveAddress, IoxRegisters_ConfigurationPort0, val);
}

void iox_output(uint8_t slaveAddress, uint16_t val) {
  iox_write16(slaveAddress, IoxRegisters_OutputPort0, val);
}

uint16_t iox_input(uint8_t slaveAddress) {
  return iox_read16(slaveAddress, IoxRegisters_InputPort0);
}

//----------------------------------------------------------------------

int main() {
  uint8_t addrSlave0 = 0x21;
  boardIo_setupLeds_rpiPico();
  boardI2c_initialize(100000);

  uint16_t portDirs = 0xFFFC;
  iox_configure_ports(addrSlave0, portDirs);

  uint32_t tick = 0;
  while (true) {
    if (tick % 1000 == 0) {
      boardIo_toggleLed1();
    }
    uint16_t portStates = iox_input(addrSlave0);
    bool isButtenPressed = bit_read(portStates, 15) == 0;
    uint8_t led0out = tick % 1000 < 500 ? 1 : 0;
    uint8_t led1out = isButtenPressed ? 1 : 0;
    iox_output(addrSlave0, (led1out << 1) | (led0out));
    delayMs(1);
    tick++;
  }
}
