/* eslint-disable @typescript-eslint/no-unused-vars */

// pseudo type definition for comminucation data format

namespace CommunicationDataBinaryForamt {
  // --------------------
  // types

  type u8 = number; // unsigend byte
  type u16 = number; // unsigned short, big endian

  type VariableLength = any;
  type Bytes<N> = number[];
  type BytesOf<N> = number[];

  type PacketHostToDevice = {};
  type PacketDeviceToHost = {};

  type bits<N> = number;
  type Reserved = any;

  // --------------------
  // config storage data writing

  type PktMemoryWriteTransactionStart = PacketHostToDevice & {
    [0]: { category: 0xb0 }; // 0xb0 for memory operation
    [1]: { dataKind: 0x01 }; // 0x01 for config storage data
    [2]: { command: 0x10 }; // 0x10 for write transaction start
  };

  type PktMemoryWriteTransactionDone = PacketHostToDevice & {
    [0]: { category: 0xb0 }; // 0xb0 for memory operation
    [1]: { dataKind: 0x01 }; // 0x01 for config storage data
    [2]: { command: 0x11 }; // 0x11 for write transaction done
  };

  type PktMemoryWritingOperation = PacketHostToDevice & {
    [0]: { category: 0xb0 }; // 0xb0 for memory operation
    [1]: { dataKind: 0x01 }; // 0x01 for config storage data
    [2]: { command: 0x20 }; // 0x20 for write request
    [3_4]: { offset: u16 };
    [5]: { dataLength: u8 };
    '6__': { data: VariableLength }; // dataLength bytes
  };

  type PktMemoryChecksumRequestOperation = PacketHostToDevice & {
    [0]: { category: 0xb0 }; // 0xb0 for memory operation
    [1]: { dataKind: 0x01 }; // 0x01 for config storage data
    [2]: { command: 0x21 }; // 0x21 for checksum request
    [3_4]: { offset: u16 };
    [5_6]: { dataLength: u16 };
  };

  type PktMemoryChecksumResponse = PacketDeviceToHost & {
    [0]: { category: 0xb0 }; // 0xb0 for memory operation
    [1]: { dataKind: 0x01 }; // 0x01 for config storage data
    [2]: { command: 0x22 }; // 0x22 for checksum response
    [3]: { checksumValue: u8 };
  };

  // --------------------
  // custom paramters data read/write

  type PktCustomParametersBulkReadRequest = PacketHostToDevice & {
    [0]: { category: 0xb0 }; // 0xb0 for memory operation
    [1]: { dataKind: 0x02 }; // 0x02 for custom parameters
    [2]: { command: 0x80 }; // 0x80 for bulk read request
  };

  type PktCustomParametersBulkReadResponse = PacketDeviceToHost & {
    [0]: { category: 0xb0 }; // 0xb0 for memory operation
    [1]: { dataKind: 0x02 }; // 0x02 for custom parameters
    [2]: { command: 0x81 }; // 0x81 for bulk read response
    [3]: { numParameters: u8 };
    // [3]: { initializedFlag: 0 | 1 };
    // [4_13]: { data: Bytes<10> };
    '4__': { values: BytesOf<'numParameters'> };
    '4+numParameters__': { maxValues: BytesOf<'numParameters'> };
  };

  type PktCustomParametersBulkWriteOperation = PacketHostToDevice & {
    [0]: { category: 0xb0 }; // 0xb0 for memory operation
    [1]: { dataKind: 0x02 }; // 0x02 for custom parameters
    [2]: { command: 0x90 }; // 0x90 for bulk write request
    [3]: { parameterIndexBase: u8 };
    [4]: { numParameters: u8 };
    '5__': { data: BytesOf<'numParameters'> };
  };

  type PktCustomParameterSingleWriteOperation = PacketHostToDevice & {
    [0]: { category: 0xb0 }; // 0xb0 for memory operation
    [1]: { dataKind: 0x02 }; // 0x02 for custom parameters
    [2]: { command: 0xa0 }; // 0xa0 for single write request
    [3]: { index: u8 }; // paramter index
    [4]: { value: u8 }; // parameter value
  };

  type PktCustomParametersResetOperation = PacketHostToDevice & {
    [0]: { category: 0xb0 }; // 0xb0 for memory operation
    [1]: { dataKind: 0x02 }; // 0x02 for custom parameters
    [2]: { command: 0xb0 }; // 0xb0 for reset request
  };

  type PktCustomParameterChangedNotification = PacketDeviceToHost & {
    [0]: { category: 0xb0 }; // 0xb0 for memory operation
    [1]: { dataKind: 0x02 }; // 0x02 for custom parameters
    [2]: { command: 0xe1 }; // 0xe0 for notification
    [3]: { index: u8 }; // paramter index
    [4]: { value: u8 }; // parameter value
  };

  // --------------------
  // device instance code write

  type PktDeviceInstanceCodeWriteOperation = PacketHostToDevice & {
    [0]: { category: 0xb0 }; // 0xb0 for memory operation
    [1]: { dataKind: 0x03 }; // 0x03 for device instance code
    [2]: { command: 0x90 }; // 0x80 for write request
    [3_10]: { data: Bytes<8> };
  };
  // --------------------
  // realtime event

  type PktRealtimeKeyStateEvent = PacketDeviceToHost & {
    [0]: { category: 0xe0 }; // 0xe0 for realtime event
    [1]: { command: 0x90 }; // 0x90 for key state changed
    [2]: { keyIndex: u8 };
    [3]: { isDown: u8 }; // (1:down, 0: up)
  };

  type PktRealtimeLayerStateEvent = PacketDeviceToHost & {
    [0]: { category: 0xe0 }; // 0xe0 for realtime event
    [1]: { command: 0x91 }; // 0x91 for layer changed
    [2_3]: { layerActiveFlags: u16 };
  };

  type PktRealtimeAssignHitEvent = PacketDeviceToHost & {
    [0]: { category: 0xe0 }; // 0xe0 for realtime event
    [1]: { command: 0x92 }; // 0x92 for assign hit
    [2_3]: {
      bit15: 1;
      bit14: Reserved;
      bit13_12: { fSlotSpec: bits<2> }; // (1:pri, 2:sec, 3:ter)
      bit11_8: { fLayerIndex: bits<4> };
      bit7_0: { fKeyIndex: bits<8> };
    };
  };

  type __draft__PktRealtimeOperationHitEvent = PacketDeviceToHost & {
    [0]: { category: 0xe0 }; // 0xe0 for realtime event
    [1]: { command: 0x92 }; // 0x92 for operation hit
    [2]: { keyIndex: u8 };
    [3]: { layerIndex: u8 };
    [4]: { operationSlot: u8 }; // [1, 2, 3] for [primary, secondary, tertiary]
  };

  // --------------------
  // general

  type PktDeviceAttributesRequest = PacketHostToDevice & {
    [0]: { category: 0xf0 }; // 0xf0 for general
    [1]: { command: 0x10 }; // 0x10 for device attributes request
  };

  type PktDeviceAttributesResponse = PacketDeviceToHost & {
    [0]: { category: 0xf0 }; // 0xf0 for general
    [1]: { command: 0x11 }; // 0x10 for device attributes response
    [2_3]: { projectReleaseBuildRevision: u16 };
    [4]: { configStorageFormatRevision: u8 };
    [5]: { rawHidMessageProtocolRevision: u8 };
    [6_13]: { projectId: Bytes<8> };
    [14]: { isOnlineProject: u8 };
    [15]: { padding: u8 };
    [16_23]: { deviceInstanceCode: Bytes<8> };
    [24_25]: { assignStorageCapacity: u16 };
    [26_41]: { variationName: Bytes<16> };
    [42_49]: { kermiteMcuCode: Bytes<8> };
    [50]: { profileBinaryFormatRevision: u8 };
    [51]: { configParametersRevision: u8 };
  };

  type __draft__PktKeyboardSideConfiguration = PacketHostToDevice & {
    [0]: { category: 0xf0 }; // 0xf0 for general
    [1]: { command: 0x20 }; // 0x20 for set kebyoard side
    [2]: { keyboardSide: u8 }; // (0:unset, 1:left, 2:right)
  };

  // --------------------
  // device operation

  type PktSpecSimulatorMode = PacketHostToDevice & {
    [0]: { category: 0xd0 }; // 0xd0 for device operation
    [1]: { command: 0x10 }; // 0x10 for side brain mode config
    [2]: { isSimulatorMode: u8 }; // (0:normal, 1:simulator)
  };

  type PktSetSimulatorHidReport = PacketHostToDevice & {
    [0]: { category: 0xd0 }; // 0xd0 for device operation
    [1]: { command: 0x20 }; // 0x20 for set simulator hid report
    [2_9]: { hidReportBuf: Bytes<8> };
  };
}
