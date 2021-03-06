#include "km0/device/boardI2c.h"
#include "km0/base/bitOperations.h"
#include <avr/io.h>
#include <util/twi.h>

void boardI2c_initialize() {

  //PD1 (SDA), input pullup
  bit_off(DDRD, 1);
  bit_on(PORTD, 1);

  //PD0 (SCL), input pullup
  bit_off(DDRD, 0);
  bit_on(PORTD, 0);

  uint32_t clockFreq = 400000;
  TWSR = 0;
  TWBR = (F_CPU / clockFreq - 16) / 2;
}

void boardI2c_write(uint8_t slaveAddress, uint8_t *buf, int len) {
  //emit start condition
  TWCR = _BV(TWINT) | _BV(TWSTA) | _BV(TWEN);
  while (bit_is_off(TWCR, TWINT)) {};

  //write sla+w
  TWDR = (slaveAddress << 1) | 0; //write
  TWCR = _BV(TWINT) | _BV(TWEN);
  while (bit_is_off(TWCR, TWINT)) {};

  for (int i = 0; i < len; i++) {
    //write data
    TWDR = buf[i];
    TWCR = _BV(TWINT) | _BV(TWEN);
    while (bit_is_off(TWCR, TWINT)) {};
  }

  //emit stop condition
  TWCR = _BV(TWINT) | _BV(TWSTO) | _BV(TWEN);
}

void boardI2c_read(uint8_t slaveAddress, uint8_t *buf, int len) {
  //emit start condition
  TWCR = _BV(TWINT) | _BV(TWSTA) | _BV(TWEN);
  while (bit_is_off(TWCR, TWINT)) {};

  //write sla+r
  TWDR = (slaveAddress << 1) | 1; //read
  TWCR = _BV(TWINT) | _BV(TWEN);
  while (bit_is_off(TWCR, TWINT)) {};

  for (int i = 0; i < len; i++) {
    //read data
    if (i < len - 1) {
      TWCR = _BV(TWINT) | _BV(TWEN) | (1 << TWEA);
    } else {
      TWCR = _BV(TWINT) | _BV(TWEN);
    }
    while (bit_is_off(TWCR, TWINT)) {};
    buf[i] = TWDR;
  }

  //emit stop condition
  TWCR = _BV(TWINT) | _BV(TWSTO) | _BV(TWEN);
}

void boardI2c_procedural_startWrite(uint8_t slaveAddress) {
  //emit start condition
  TWCR = _BV(TWINT) | _BV(TWSTA) | _BV(TWEN);
  while (bit_is_off(TWCR, TWINT)) {};

  //write sla+w
  TWDR = (slaveAddress << 1) | 0; //write
  TWCR = _BV(TWINT) | _BV(TWEN);
  while (bit_is_off(TWCR, TWINT)) {};
}

void boardI2c_procedural_putByte(uint8_t data) {
  //write data
  TWDR = data;
  TWCR = _BV(TWINT) | _BV(TWEN);
  while (bit_is_off(TWCR, TWINT)) {};
}

void boardI2c_procedural_endWrite() {
  //emit stop condition
  TWCR = _BV(TWINT) | _BV(TWSTO) | _BV(TWEN);
}