import {
  ConfigStorageFormatRevision,
  generateNumberSequence,
  IKeyboardDeviceStatus,
  IProjectResourceInfo,
  IRealtimeKeyboardEvent,
  RawHidMessageProtocolRevision,
} from '~/shared';
import { createEventPort } from '~/shell/funcs';
import { projectResourceProvider } from '~/shell/projectResources';
import { Packets } from '~/shell/services/device/KeyboardDevice/Packets';
import { recievedBytesDecoder } from '~/shell/services/device/KeyboardDevice/ReceivedBytesDecoder';
import { IDeviceWrapper } from './DeviceWrapper';

async function getProjectInfoFromProjectId(
  projectId: string,
): Promise<IProjectResourceInfo | undefined> {
  const resourceInfos = await projectResourceProvider.getAllProjectResourceInfos();
  const info = resourceInfos.find((info) => info.projectId === projectId);
  return info;
}

function createConnectedStatus(
  info: IProjectResourceInfo,
): IKeyboardDeviceStatus {
  return {
    isConnected: true,
    deviceAttrs: {
      projectId: info.projectId,
      keyboardName: info.keyboardName,
    },
  };
}

function checkDeviceRevisions(data: {
  projectReleaseBuildRevision: number;
  configStorageFormatRevision: number;
  rawHidMessageProtocolRevision: number;
}) {
  const { configStorageFormatRevision, rawHidMessageProtocolRevision } = data;

  if (configStorageFormatRevision !== ConfigStorageFormatRevision) {
    console.log(
      `incompatible config storage revision (software:${ConfigStorageFormatRevision} firmware:${configStorageFormatRevision})`,
    );
  }
  if (rawHidMessageProtocolRevision !== RawHidMessageProtocolRevision) {
    console.log(
      `incompatible message protocol revision (software:${RawHidMessageProtocolRevision} firmware:${rawHidMessageProtocolRevision})`,
    );
  }
}

export class KeyboardDeviceServiceCore {
  realtimeEventPort = createEventPort<IRealtimeKeyboardEvent>();

  private device: IDeviceWrapper | undefined;

  private deviceStatus: IKeyboardDeviceStatus = {
    isConnected: false,
  };

  statusEventPort = createEventPort<IKeyboardDeviceStatus>({
    initialValueGetter: () => this.deviceStatus,
  });

  private setStatus(newStatus: IKeyboardDeviceStatus) {
    this.deviceStatus = newStatus;
    this.statusEventPort.emit(newStatus);
  }

  private parameterInitializationTried = false;

  private initializeDeviceCustromParameters() {
    // todo: プロジェクトの定義からパラメタ初期値のセットを取得
    const m = (Math.random() * 100) >> 0;
    const initialParametrs = generateNumberSequence(10).map((a) => m + a);

    this.device?.writeSingleFrame(
      Packets.makeCustomParametersBulkWriteOperationFrame(initialParametrs),
    );
    this.device?.writeSingleFrame(Packets.customParametersBulkReadRequestFrame);
  }

  private onDeviceDataReceived = async (buf: Uint8Array) => {
    const res = recievedBytesDecoder(buf);
    if (res?.type === 'deviceAttributeResponse') {
      console.log(`device attrs received, projectId: ${res.data.projectId}`);
      checkDeviceRevisions(res.data);
      const info = await getProjectInfoFromProjectId(res.data.projectId);
      if (info) {
        this.setStatus(createConnectedStatus(info));
      }
    }
    if (res?.type === 'custromParametersReadResponse') {
      console.log(`custom parameters received,`, res.data);
      if (
        !res.data.isParametersInitialized &&
        !this.parameterInitializationTried
      ) {
        this.parameterInitializationTried = true;
        this.initializeDeviceCustromParameters();
      }
    }
    if (res?.type === 'realtimeEvent') {
      this.realtimeEventPort.emit(res.event);
    }
  };

  private clearDevice = () => {
    this.setStatus({ isConnected: false, deviceAttrs: undefined });
    this.device = undefined;
    this.parameterInitializationTried = false;
  };

  setDeivce(device: IDeviceWrapper | undefined) {
    this.clearDevice();
    if (device) {
      device.onData(this.onDeviceDataReceived);
      device.onClosed(this.clearDevice);
      device.writeSingleFrame(Packets.deviceAttributesRequestFrame);
      device.writeSingleFrame(Packets.customParametersBulkReadRequestFrame);
    }
    this.device = device;
  }

  private isSideBrainMode = false;

  setSideBrainMode(enabled: boolean) {
    this.isSideBrainMode = enabled;
    if (this.device) {
      console.log(`writeSideBrainMode ${enabled ? 1 : 0}`);
      if (!enabled) {
        const blankHidReport = [0, 0, 0, 0, 0, 0, 0, 0];
        this.writeSideBrainHidReport(blankHidReport);
      }
      const pk = Packets.makeSideBrainModeSpecFrame(enabled);
      this.device.writeSingleFrame(pk);
    }
  }

  writeSideBrainHidReport(report: number[]) {
    if (this.device && this.isSideBrainMode && report.length === 8) {
      console.log(JSON.stringify(report));
      const pk = Packets.makeSideBrainHidReportFrame(report);
      this.device.writeSingleFrame(pk);
    }
  }
}
