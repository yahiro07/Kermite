import {
  ConfigStorageFormatRevision,
  createDictionaryFromKeyValues,
  createGroupedArrayByKey,
  flattenArray,
  IAssignEntry,
  IAssignOperation,
  ILayer,
  IProfileData,
  isModifierVirtualKey,
  LayerInvocationMode,
  ModifierVirtualKey,
  ProfileBinaryFormatRevision,
  sortOrderBy,
} from '~/shared';
import {
  writeBytes,
  writeUint16LE,
  writeUint8,
} from '~/shell/services/device/keyboardDevice/Helpers';
import { getLogicalKeyForVirtualKey } from '~/shell/services/keyboardLogic/inputLogicSimulatorD/LogicalKey';
// import { getHidKeyCodeEx } from '~/shell/services/keyboardLogic/inputLogicSimulatorD/HidKeyCodes';

/*
Key Assigns Restriction
supports max 16 Layers
supports max 255 Keys
layerIndex: 0~15
keyIndex: 0~254
*/

interface IRawAssignEntry {
  keyId: string;
  keyIndex: number;
  layerId: string;
  layerIndex: number;
  entry: IAssignEntry;
}

interface IRawLayerInfo {
  layerIndex: number;
  isShiftLayer: boolean;
}

const localContext = new (class {
  // layoutStandard: IKeyboardLayoutStandard = 'US';
  layersDict: { [layerId: string]: IRawLayerInfo } = {};
  useShiftCancel: boolean = false;
})();

function makeAttachedModifiersBits(
  attachedModifiers?: ModifierVirtualKey[],
): number {
  let bits = 0;
  if (attachedModifiers) {
    for (const m of attachedModifiers) {
      m === 'K_Ctrl' && (bits |= 0x01);
      m === 'K_Shift' && (bits |= 0x02);
      m === 'K_Alt' && (bits |= 0x04);
      m === 'K_OS' && (bits |= 0x08);
    }
  }
  return bits;
}

function makeLayerInvocationModeBits(mode: LayerInvocationMode): number {
  const mapper: { [key in LayerInvocationMode]: number } = {
    hold: 1,
    turnOn: 2,
    turnOff: 3,
    toggle: 4,
    oneshot: 5,
  };
  return mapper[mode] || 0;
}

/*
noOperation
0bTTxx_xxxx
0b00~
TT: type, 0b00 for no operation

keyInput (logicalKey)
0bTTxS_MMMM 0bxKKK_KKKK
0b01~
TT: type, 0b01 for keyInput
S: isShiftLayer
MMMM: modifiers, [os, alt, shift, ctrl] for msb-lsb
KKK_KKKK: logical keycode

layerCall
0bTTxx_LLLL 0bIIII_xxxx
0b10~
TT: type, 0b10 for layerCall
LLLL: layerIndex
IIII: invocation mode
 1: hold
 2: turnOn
 3: turnOff
 4: toggle
 5: oneshot

layerClearExclusive
0bTTxx_xFFF 0bxxxx_xQQQ
0b11xx_x001 ~
TT: type, 0b11 for extended operations
FFF: extended operation type, 0b001 for layer clear exclusive
QQQ: target exclusion group

MousePointerMovement (NOT IMPLEMENTED YET)
0bTTxx_xFFF AAAA_AAAA BBBB_BBBB
0b11xx_x010 ~
TT: type, 0b11 for extended operations
FFF: extended operation type, 0b010 for mouse pointer movement
AAAA_AAAA: movement amount x, -128~127
BBBB_BBBB: movement amount y, -128~127

CustomCommand (NOT IMPLEMENTED YET)
0bTTxx_xFFF CCCC_CCCC
0b11xx_x011 ~
TT: type, 0b11 for extended operations
FFF: extended operation type, 0b011 for user custom command
CCCC_CCCC: user custom command index
*/
function encodeAssignOperation(
  op: IAssignOperation | undefined,
  layer: IRawLayerInfo,
): number[] {
  if (op?.type === 'keyInput') {
    const fAssignType = 0b01;
    const vk = op.virtualKey;
    if (isModifierVirtualKey(vk)) {
      const mods = makeAttachedModifiersBits([vk]);
      return [(fAssignType << 6) | mods, 0];
    } else {
      const { useShiftCancel } = localContext;
      const mods = makeAttachedModifiersBits(op.attachedModifiers);
      const logicalKey = getLogicalKeyForVirtualKey(vk);
      const fIsShiftCancellable = useShiftCancel && layer.isShiftLayer ? 1 : 0;
      // if (!(useShiftCancel && layer.isShiftLayer)) {
      //   // ShiftCancelオプションが有効で、shiftレイヤの場合のみ、shift cancel bitを維持
      //   // そうでない場合はshift cancel bitを削除
      //   hidKey = hidKey & 0x1ff;
      // }
      return [
        (fAssignType << 6) | (fIsShiftCancellable << 4) | mods,
        logicalKey,
      ];
    }
  }
  if (op?.type === 'layerCall') {
    const fAssignType = 0b10;
    const layerInfo = localContext.layersDict[op.targetLayerId];
    if (layerInfo) {
      const { layerIndex } = layerInfo;
      const fInvocationMode = makeLayerInvocationModeBits(op.invocationMode);
      return [(fAssignType << 6) | layerIndex, fInvocationMode << 4];
    }
  }
  if (op?.type === 'layerClearExclusive') {
    const fAssingType = 0b11;
    const fExOperationType = 1;
    const targetGroup = op.targetExclusionGroup;
    return [(fAssingType << 6) | fExOperationType, targetGroup];
  }
  return [0];
}

function encodeOperationWordLengths(operationWordLengths: number[]) {
  let value = 0;
  const szPri = operationWordLengths[0];
  const szSec = operationWordLengths[1] || 0;
  const szTer = operationWordLengths[2] || 0;
  value |= (szPri - 1) << 6;
  value |= szSec << 3;
  value |= szTer;
  return value;
}

/*
rawAssignEntryHeader
0b1TTT_LLLL <0bAABB_BCCC>
TTT: type
 0: reserved
 1: single
 2: dual
 3: triple
 4: block
 5: transparent
LLLL: layerIndex
AABBBCCC: set of opertion data length, exist when single/dual/triple assign
AA: tertiary operation data length, (0: 1byte, 1:2byte, 2:3byte, 3:4byte)
BBB: secondary operation data length, (0: 0byte, 1:1byte, 2:2byte, 3:3byte, 4:4byte)
CCC: primary operation data length, (0: 0byte, 1:1byte, 2:2byte, 3:3byte, 4:4byte)
*/
function encodeRawAssignEntryHeaderBytes(
  type: 'single' | 'dual' | 'triple' | 'block' | 'transparent',
  layerIndex: number,
  operationWordLengths?: number[],
): number[] {
  const assignType = {
    single: 1,
    dual: 2,
    triple: 3,
    block: 4,
    transparent: 5,
  }[type];
  const firstByte = (1 << 7) | (assignType << 4) | layerIndex;
  const hasSecondByte = [1, 2, 3].includes(assignType);
  return hasSecondByte && operationWordLengths
    ? [firstByte, encodeOperationWordLengths(operationWordLengths)]
    : [firstByte];
}

/*
rawAssignEntry
0x~ HH, for block and transparent assign entry
0x~ HH DD, PP <PP PP PP>, for single assign entry
0x~ HH DD, PP <PP PP PP>, SS <SS SS SS>, for dual assign entry
0x~ HH DD, PP <PP PP PP>, SS <SS SS SS>, TT <TT TT TT>, for triple assign entry
HH: assign entry header
DD: assign entry body length
PP: primary operation (variable length, 1~4bytes)
SS: secondary operation (variable length, 1~4bytes)
TT: tertiary operation (variable length, 1~4bytes)
*/
function encodeRawAssignEntry(ra: IRawAssignEntry): number[] {
  const { entry } = ra;

  const layer = localContext.layersDict[ra.layerId];

  if (entry.type === 'block') {
    return encodeRawAssignEntryHeaderBytes('block', ra.layerIndex);
  } else if (entry.type === 'transparent') {
    return encodeRawAssignEntryHeaderBytes('transparent', ra.layerIndex);
  } else if (entry.type === 'single') {
    // single
    const primaryOpWord = encodeAssignOperation(entry.op, layer);
    return [
      ...encodeRawAssignEntryHeaderBytes('single', ra.layerIndex, [
        primaryOpWord.length,
      ]),
      ...primaryOpWord,
    ];
  } else {
    // dual
    if (entry.tertiaryOp) {
      const operationWords = [
        encodeAssignOperation(entry.primaryOp, layer),
        encodeAssignOperation(entry.secondaryOp, layer),
        encodeAssignOperation(entry.tertiaryOp, layer),
      ];
      return [
        ...encodeRawAssignEntryHeaderBytes(
          'triple',
          ra.layerIndex,
          operationWords.map((it) => it.length),
        ),
        ...flattenArray(operationWords),
      ];
    } else if (entry.secondaryOp) {
      const operationWords = [
        encodeAssignOperation(entry.primaryOp, layer),
        encodeAssignOperation(entry.secondaryOp, layer),
      ];
      return [
        ...encodeRawAssignEntryHeaderBytes(
          'dual',
          ra.layerIndex,
          operationWords.map((it) => it.length),
        ),
        ...flattenArray(operationWords),
      ];
    } else {
      const primaryOpWord = encodeAssignOperation(entry.primaryOp, layer);
      return [
        ...encodeRawAssignEntryHeaderBytes('single', ra.layerIndex, [
          primaryOpWord.length,
        ]),
        ...primaryOpWord,
      ];
    }
  }
}

/*

0b1SSS_SSSS 0bKKKK_KKKK
SSS_SSSS: body length
KKKK_KKKK: keyIndex
*/
function encodeKeyBoundAssignsSetHeder(
  keyIndex: number,
  bodyLength: number,
): number[] {
  if (bodyLength > 127) {
    throw new Error(
      `key bound assign size overrun, keyIndex: ${keyIndex}, bodyLength: ${bodyLength}/127`,
    );
  }
  return [(1 << 7) | bodyLength, keyIndex];
}

/*
0x~ HH HH VV VV ...
HH HH: header bytes
VV VV ...: body bytes, variable length
*/
function encodeKeyBoundAssignsSet(assigns: IRawAssignEntry[]): number[] {
  const { keyIndex } = assigns[0];
  const bodyBytes = [...flattenArray(assigns.map(encodeRawAssignEntry))];
  const headBytes = encodeKeyBoundAssignsSetHeder(keyIndex, bodyBytes.length);
  return [...headBytes, ...bodyBytes];
}

function makeRawAssignEntries(profile: IProfileData): IRawAssignEntry[] {
  const {
    assigns,
    layers,
    keyboardDesign: { keyEntities },
  } = profile;

  return Object.keys(assigns)
    .map((key) => {
      const [layerId, keyId] = key.split('.');
      const layerIndex = layers.findIndex((la) => la.layerId === layerId);
      const keyEntity = keyEntities.find((ke) => ke.keyId === keyId);
      const keyIndex =
        keyEntity?.keyIndex !== undefined ? keyEntity.keyIndex : -1;
      const entry = assigns[key];
      if (layerIndex !== -1 && keyIndex !== -1 && entry) {
        return {
          keyId,
          keyIndex,
          layerId,
          layerIndex,
          entry,
        };
      }
      return undefined!;
    })
    .filter((ra) => !!ra);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// function hexBytes(bytes: number[], splitter = ',') {
//   return bytes.map((b) => ('00' + b.toString(16)).slice(-2)).join(splitter);
// }

/*
function fixAssignOperation(
  op: IAssignOperation,
  layout: IKeyboardLayoutStandard,
) {
  if (op.type === 'keyInput') {
    const vk = op.virtualKey;
    let mods = op.attachedModifiers;

    const isMacOS = true;
    if (isMacOS) {
      // MACでJIS配列の場合,バックスラッシュをAlt+¥に置き換える
      if (layout === 'JIS' && vk === 'K_BackSlash') {
        if (!mods) {
          mods = ['K_Alt'];
        }
        if (mods && !mods.includes('K_Alt')) {
          mods.push('K_Alt');
        }
        op.virtualKey = 'K_Yen';
        op.attachedModifiers = mods;
      }
    }
  }
}

function fixProfileData(
  profile: IProfileData,
  layout: IKeyboardLayoutStandard,
) {
  for (const key in profile.assigns) {
    const assign = profile.assigns[key];
    if (assign) {
      if (assign.type === 'single' && assign.op) {
        fixAssignOperation(assign.op, layout);
      }
      if (assign.type === 'dual') {
        if (assign.primaryOp) {
          fixAssignOperation(assign.primaryOp, layout);
        }
        if (assign.secondaryOp) {
          fixAssignOperation(assign.secondaryOp, layout);
        }
        if (assign.tertiaryOp) {
          fixAssignOperation(assign.tertiaryOp, layout);
        }
      }
    }
  }
}
*/

function createChunk(headerWord: number, bodyBytes: number[]) {
  const buffer = Array(bodyBytes.length + 4).fill(0);
  writeUint16LE(buffer, 0, headerWord);
  writeUint16LE(buffer, 2, bodyBytes.length);
  writeBytes(buffer, 4, bodyBytes);
  return buffer;
}

function encodeProfileHeaderData(numKeys: number, numLayers: number): number[] {
  const buffer = Array(5).fill(0);
  writeUint8(buffer, 0, 0x01);
  writeUint8(buffer, 1, ConfigStorageFormatRevision);
  writeUint8(buffer, 2, ProfileBinaryFormatRevision);
  writeUint8(buffer, 3, numKeys);
  writeUint8(buffer, 4, numLayers);
  return buffer;
}

// LayerAttributeByte
// 0bDxIx_MMMM 0bxxxx_xQQQ
// D: default scheme, 0 for transparent, 1 for block
// I: initialActive
// MMMM: attachedModifiers
// QQQ: exclusion group, 0~7
function encodeLayerListData(layers: ILayer[]): number[] {
  return flattenArray(
    layers.map((la) => {
      const fDefaultScheme = la.defaultScheme === 'block' ? 1 : 0;
      const fInitialActive = la.initialActive ? 1 : 0;
      const fAttachedModifiers = makeAttachedModifiersBits(
        la.attachedModifiers,
      );
      return [
        (fDefaultScheme << 7) | (fInitialActive << 5) | fAttachedModifiers,
        la.exclusionGroup,
      ];
    }),
  );
}

function encodeKeyAssignsData(profile: IProfileData): number[] {
  const numLayers = profile.layers.length;
  const rawAssigns = makeRawAssignEntries(profile);
  rawAssigns.sort(
    sortOrderBy((ra) => ra.keyIndex * 100 + (numLayers - ra.layerIndex)),
  );
  // console.log(rawAssigns);
  const groupedAssignBytes = createGroupedArrayByKey(
    rawAssigns,
    'keyIndex',
  ).map(encodeKeyBoundAssignsSet);
  // console.log(groupedAssignBytes.map((a) => hexBytes(a, ' ')));
  return flattenArray(groupedAssignBytes);
}

function setupLocalContext(profile: IProfileData) {
  // レイヤ情報をグローバル変数に格納(末端の関数でこれを参照する)
  localContext.layersDict = createDictionaryFromKeyValues(
    profile.layers.map((la, idx) => [
      la.layerId,
      {
        layerIndex: idx,
        isShiftLayer: la.attachedModifiers?.includes('K_Shift') || false,
      },
    ]),
  );
  localContext.useShiftCancel = profile.settings.useShiftCancel;
}

// デバイスのEEPROMに書き込むキーアサインバイナリデータを生成する
// [0:numLayers*2-1]: layer attributes
// [numLayers*2:~] key assings data
// export function converProfileDataToBlobBytes(
//   profile: IProfileData,
//   // layoutStandard: IKeyboardLayoutStandard,
// ): number[] {}

export function makeProfileBinaryData(
  profile: IProfileData,
  // layout: IKeyboardLayoutStandard,
): number[] {
  setupLocalContext(profile);
  // const profile = duplicateObjectByJsonStringifyParse(profile0);
  // fixProfileData(profile, layoutStandard);
  // localContext.layoutStandard = layoutStandard;

  const numKeys = profile.keyboardDesign.keyEntities.length;
  const numLayers = profile.layers.length;

  const profileHeaderData = encodeProfileHeaderData(numKeys, numLayers);
  const profileHeaderChunk = createChunk(0xbb71, profileHeaderData);

  const layerListData = encodeLayerListData(profile.layers);
  const layerListChunk = createChunk(0xbb74, layerListData);

  const keyAssignsData = encodeKeyAssignsData(profile);
  const keyAssignsChunk = createChunk(0xbb78, keyAssignsData);

  return [...profileHeaderChunk, ...layerListChunk, ...keyAssignsChunk];

  // const buf = [...layerAttributeBytes, ...keyAssignsBufferBytes];
  // console.log(`len: ${buf.length}`);
  // console.log(hexBytes(buf));
  // return buf;

  // const layerListData = encodla

  // const assignsDataBytes = converProfileDataToBlobBytes(profileData);
  // const headerBytes = encodeHeaderBytes(
  //   numKeys,
  //   numLayers,
  //   assignsDataBytes.length,
  // );
  // return [...headerBytes, ...assignsDataBytes];
}
