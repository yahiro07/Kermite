#ifndef __VERSIONS_H__

#define KERMITE_CONFIG_STORAGE_FORMAT_REVISION 4

#define KERMITE_RAWHID_MESSAGE_PROTOCOL_REVISION 1

#define KERMITE_PROJECT_RELEASE_BUILD_REVISION EXTR_KERMITE_PROJECT_RELEASE_BUILD_REVISION

#define KERMITE_IS_RESOURCE_ORIGIN_ONLINE EXTR_KERMITE_IS_RESOURCE_ORIGIN_ONLINE

#define KERMITE_VARIATION_NAME EXTR_KERMITE_VARIATION_NAME

#if defined KERMITE_TARGET_MCU_ATMEGA
#define KERMITE_MCU_CODE "A152FD20"
#elif defined KERMITE_TARGET_MCU_RP2040
#define KERMITE_MCU_CODE "A152FD21"
#else
#error KERMITE_TARGET_MCU_* is not defined
#endif

#endif