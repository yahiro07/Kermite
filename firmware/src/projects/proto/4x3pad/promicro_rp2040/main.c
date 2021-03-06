#include "config.h"
#include "km0/device/boardIo.h"
#include "km0/device/debugUart.h"
#include "km0/device/digitalIo.h"
#include "km0/kernel/keyboardMain.h"
#include "km0/scanner/keyScanner_basicMatrix.h"
#include "km0/wrapper/generalKeyboard.h"

#define NumColumns 4
#define NumRows 3

static const uint8_t columnPins[NumColumns] = { GP2, GP3, GP4, GP5 };
static const uint8_t rowPins[NumRows] = { GP7, GP8, GP9 };

int main() {
  boardIo_setupLeds_proMicroRp();
  debugUart_initialize(38400);
  keyScanner_basicMatrix_initialize(NumRows, NumColumns, rowPins, columnPins, 0);
  keyboardMain_useKeyScanner(keyScanner_basicMatrix_update);
  generalKeyboard_start();
  return 0;
}
