import { generateNumberSequence } from '~/shared';
import { bhi, blo } from '~/shell/services/device/keyboardDevice/Helpers';

export class Packets {
  static deviceAttributesRequestFrame = [0xf0, 0x10];

  static makeSimulatorModeSpecFrame(enabled: boolean) {
    return [0xd0, 0x10, enabled ? 1 : 0];
  }

  static makeSimulatorHidReportFrame(report: number[]) {
    return [0xd0, 0x20, ...report];
  }

  // ------------------------------------------------------------

  static customParametersBulkReadRequestFrame = [0xb0, 0x02, 0x80];

  static makeCustomParametersBulkWriteOperationFrame(data: number[]) {
    return [0xb0, 0x02, 0x90, ...data];
  }

  static makeCustomParameterSignleWriteOperationFrame(
    index: number,
    value: number,
  ) {
    return [0xb0, 0x02, 0xa0, index, value];
  }

  // ------------------------------------------------------------

  static makeDeviceInstanceCodeWriteOperationFrame(code: string) {
    const bytes = generateNumberSequence(8).map((i) => code.charCodeAt(i) || 0);
    return [0xb0, 0x03, 0x90, ...bytes];
  }

  // ------------------------------------------------------------

  static memoryWriteTransactionStartFrame = [0xb0, 0x01, 0x10];

  static memoryWriteTransactionEndFrame = [0xb0, 0x01, 0x11];

  static makeMemoryWriteOperationFrames(
    bytes: number[],
    dataKind: 'keyMapping',
  ): number[][] {
    const sz = 64 - 6;
    const numFrames = Math.ceil(bytes.length / sz);
    const dataKindByte = (dataKind === 'keyMapping' && 0x01) || 0;

    return generateNumberSequence(numFrames).map((k) => {
      const offset = k * sz;
      const data = bytes.slice(offset, offset + sz);
      return [
        0xb0,
        dataKindByte,
        0x20,
        bhi(offset),
        blo(offset),
        data.length,
        ...data,
      ];
    });
  }

  static makeMemoryChecksumRequestFrame(
    dataKind: 'keyMapping',
    offset: number,
    length: number,
  ): number[] {
    const dataKindByte = (dataKind === 'keyMapping' && 0x01) || 0;
    return [
      0xb0,
      dataKindByte,
      0x21,
      bhi(offset),
      blo(offset),
      bhi(length),
      blo(length),
    ];
  }
}
