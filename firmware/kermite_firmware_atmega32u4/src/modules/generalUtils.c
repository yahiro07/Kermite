#include "generalUtils.h"
#include "bit_operations.h"
#include <stdio.h>

void generalUtils_debugShowBytes(uint8_t *buf, uint16_t len) {
  for (uint16_t i = 0; i < len; i++) {
    printf("%02X ", buf[i]);
  }
  printf("\n");
}

void generalUtils_debugShowBytesDec(uint8_t *buf, uint16_t len) {
  for (uint16_t i = 0; i < len; i++) {
    printf("%d ", buf[i]);
  }
  printf("\n");
}

void generalUtils_copyBytes(uint8_t *dst, uint8_t *src, uint16_t len) {
  for (uint16_t i = 0; i < len; i++) {
    dst[i] = src[i];
  }
}

void generalUtils_copyBitFlagsBuf(uint8_t *dstBuf, uint8_t dstOffset, uint8_t *srcBuf, uint8_t srcOffset, uint8_t count) {
  for (uint8_t i = 0; i < count; i++) {
    uint8_t srcPos = srcOffset + i;
    uint8_t bi0 = srcPos >> 3;
    uint8_t fi0 = srcPos & 0b111;
    uint8_t dstPos = dstOffset + i;
    uint8_t bi1 = dstPos >> 3;
    uint8_t fi1 = dstPos & 0b111;
    uint8_t val = bit_read(srcBuf[bi0], fi0);
    bit_spec(dstBuf[bi1], fi1, val);
  }
}

bool generalUtils_compareBytes(uint8_t *arr1, uint8_t *arr2, uint16_t len) {
  for (size_t i = 0; i < len; i++) {
    if (arr1[i] != arr2[i]) {
      return false;
    }
  }
  return true;
}