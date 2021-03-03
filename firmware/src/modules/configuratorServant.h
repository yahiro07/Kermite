#ifndef __CONFIGURATOR_SERVANT_H__
#define __CONFIGURATOR_SERVANT_H__

#include "types.h"

enum {
  ConfiguratorServantState_KeyMemoryUpdationStarted = 1,
  ConfiguratorServentState_KeyMemoryUpdationDone = 2,
  ConfiguratorServentState_SideBrainModeEnabled = 10,
  ConfiguratorServentState_SideBrainModeDisabled = 11
};

void configuratorServant_initialize(
    void (*stateNotificationCallback)(uint8_t state),
    void (*customParameterChangedCallback)(uint8_t slotIndex, uint8_t value));
void configuratorServant_processUpdate();
void configuratorServant_emitRealtimeKeyEvent(uint8_t keyIndex, bool isDown);
void configuratorServant_emitRelatimeLayerEvent(uint16_t layerFlags);
void configuratorServant_emitRelatimeAssignHitEvent(uint16_t assignHitResult);

#endif