TARGET_MCU = rp2040

MODULE_SRCS += km0/device/rp2040/digitalIo.c
PROJECT_PIOASM_SRCS += swtxrx.pio
PROJECT_SRCS += main2.c