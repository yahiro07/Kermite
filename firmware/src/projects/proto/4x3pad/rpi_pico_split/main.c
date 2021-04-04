#include "config.h"
#include "dio.h"
#include "splitKeyboard.h"

#define NumColumns 4
#define NumRows 3
#define NumKeySlots 24

static const uint8_t columnPins[NumColumns] = { GP2, GP3, GP4, GP5 };
static const uint8_t rowPins[NumRows] = { GP7, GP8, GP9 };

// clang-format off
static const int8_t keyIndexTable[NumKeySlots] = {
  //left
  0,  1,  2,  3,
  4,  5,  6,  7,
  8,  9, 10, 11,
  //right
  12, 13, 14, 15,
  16, 17, 18, 19,
  20, 21, 22, 23
};
// clang-format on

int main() {
  splitKeyboard_useIndicatorLEDs(GP25, GP25, false); //RPi pico
  // generalKeyboard_useIndicatorRgbLED(GP25); //promicro rp2040
  splitKeyboard_useDebugUART(115200);
  splitKeyboard_setup(NumRows, NumColumns, rowPins, columnPins, keyIndexTable);
  splitKeyboard_start();
  return 0;
}
