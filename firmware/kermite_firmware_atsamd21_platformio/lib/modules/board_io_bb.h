#ifndef __BOARD_BB_H__
#define __BOARD_BB_H__

#include <Arduino.h>

#if 1
//Reverse pin mappings for Feather M0 pin definitions
enum
{
  PA_11 = 0,
  PA_10,
  PA_14,
  PA_09,
  PA_08,
  PA_15,
  PA_20,
  PA_21,
  PA_06,
  PA_07,
  PA_18,
  PA_16,
  PA_19,
  PA_17,
  PA_02,
  PB_08,
  PB_09,
  PA_04,
  PA_05,
  PB_02,
  PA_22,
  PA_23,
  PA_12,
  PB_10,
  PB_11,
  PB_03,
  PA_27,
  PA_28,
  PA_24,
  PA_25,
  PB_22,
  PB_23,
  // PA_22,
  // PA_23,
  // PA_19,
  // PA_16,
  // PA_18,
  // PA_17,
  PA_13 = 38,
  // PA_21,
  // PA_6,
  // PA_7,
  PA_03 = 42,
  // PA_2,
  // PA_6,
  // PA_7,
};

#endif

#define P_LED0 PA_06
#define P_LED1 PA_10
#define P_BUTTON0 PA_02

void board_initBoardIo();
void board_turnOnLED0();
void board_turnOffLED0();
void board_toggleLED0();
void board_outputLED0(bool state);
void board_turnOnLED1();
void board_turnOffLED1();
void board_toggleLED1();

void board_outputLED1(bool state);

#define BT_RES_DOWN_TRIGGER 1
#define BT_RES_UP_TRIGGER -1
#define BT_RES_NONE 0
#define BT_RES_DOWN 2

int board_readButton0();

#endif