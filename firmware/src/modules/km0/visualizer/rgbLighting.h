#ifndef __RGB_LIGHTING_H__
#define __RGB_LIGHTING_H__

#include "km0/types.h"

void rgbLighting_preConfigure();

void rgbLighting_initialize();

void rgbLighting_setBoardSide(int8_t side);

void rgbLighting_update();

#endif