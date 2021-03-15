#include "config.h"
#include "dio.h"
#include "generalKeyboard.h"
#include <avr/pgmspace.h>

#define NumRows GK_NUM_ROWS
#define NumColumns GK_NUM_COLUMNS
#define NumKeySlots (NumRows * NumColumns)

static const uint8_t rowPins[NumRows] = { P_D4, P_C6, P_D7, P_E6, P_B4 };
static const uint8_t columnPins[NumColumns] = { P_F4, P_F5, P_F6 };

// clang-format off
static const int8_t keyIndexTable[NumKeySlots] PROGMEM = {
  0, 1, 2,  
  3, 4, 5,
  6, 7, 8,
  9, 10, 11,
  12, 13, 14
};
// clang-format on

int main() {
  generalKeyboard_useOnboardLeds();
  generalKeyboard_setup(rowPins, columnPins, keyIndexTable);
  generalKeyboard_start();
  return 0;
}
