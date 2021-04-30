TARGET_MCU = rp2040

MODULE_SRCS += km0/base/utils.c
MODULE_SRCS += km0/device/rp2040/system.c
MODULE_SRCS += km0/device/rp2040/digitalIo.c
MODULE_SRCS += km0/device/rp2040/debugUart.c
MODULE_SRCS += km0/device/rp2040/boardIo.c

# PROJECT_SRCS += main_pseudo_open_drain.c
# PROJECT_SRCS += main_i2c_tca9555.c
# PROJECT_SRCS += main_i2c_master_slave.c
# PROJECT_SRCS += main_oled_minimum.c
# PROJECT_SRCS += main_debug_encoder.c
PROJECT_SRCS += main_pin_observer_dev.c
#PROJECT_SRCS += main_debug_encoder.c
# PROJECT_SRCS += main_paw3204tj3l.c
