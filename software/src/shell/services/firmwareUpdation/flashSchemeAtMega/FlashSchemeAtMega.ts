import { IFirmwareUpdationScheme } from '~/shell/services/firmwareUpdation/Interfaces';
import { ComPortsMonitor } from '~/shell/services/firmwareUpdation/flashSchemeAtMega/ComPortsMonitor';
import { FlashCommander } from '~/shell/services/firmwareUpdation/flashSchemeAtMega/FlashCommander';

export class FirmwareUpdationSchemeAtMega implements IFirmwareUpdationScheme {
  private comPortsMonitor = new ComPortsMonitor();

  resetDeviceDetectionStatus() {
    this.comPortsMonitor.resetDeviceDetectionStatus();
  }

  async updateDeviceDetection() {
    return await this.comPortsMonitor.updateDeviceDetection();
  }

  async flashFirmware(
    dectectedDeviceSig: string,
    firmwareFilePath: string,
  ): Promise<'ok' | string> {
    const comPortName = dectectedDeviceSig;
    const hexFilePath = firmwareFilePath;

    const flashResult = await FlashCommander.uploadFirmware(
      hexFilePath,
      comPortName,
    );
    if (flashResult !== 'ok') {
      console.log(`firmwre upload error`);
    }
    console.log(flashResult);
    return flashResult;
  }
}
