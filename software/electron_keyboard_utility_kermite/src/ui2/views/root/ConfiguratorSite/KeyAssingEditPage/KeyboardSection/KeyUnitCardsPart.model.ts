import {
  IAssignOperation,
  IKeyUnitEntry,
  IAssignEntry
} from '~defs/ProfileData';
import { VirtualKeyTexts } from '~defs/VirtualKeyTexts';
import { editorModel, appDomain, playerModel } from '~ui2/models/zAppDomain';

export interface IKeyUnitCardViewModel {
  keyUnitId: string;
  pos: {
    x: number;
    y: number;
    r: number;
  };
  isCurrent: boolean;
  setCurrent: () => void;
  primaryText: string;
  secondaryText: string;
  isHold: boolean;
}

export interface IKeyUnitCardPartViewModel {
  cards: IKeyUnitCardViewModel[];
}

function getAssignOperationText(op?: IAssignOperation): string {
  if (op?.type === 'keyInput') {
    const keyText = VirtualKeyTexts[op.virtualKey] || '';
    if (op.attachedModifiers) {
      const modText = op.attachedModifiers
        .map((m) => VirtualKeyTexts[m]?.charAt(0))
        .join('+');
      return `${modText}+${keyText}`;
    }
    return keyText;
  }
  if (op?.type === 'layerCall') {
    const layer = editorModel.layers.find(
      (la) => la.layerId === op.targetLayerId
    );
    return (layer && layer.layerName) || '';
  }
  if (op?.type === 'modifierCall') {
    return VirtualKeyTexts[op.modifierKey] || '';
  }
  return '';
}

function getAssignEntryTexts(
  assign?: IAssignEntry
): { primaryText: string; secondaryText: string } {
  if (assign) {
    // if (assign.type === 'transparent') {
    //   return {
    //     primaryText: 'TR',
    //     secondaryText: ''
    //   };
    // }
    if (assign.type === 'single') {
      return {
        primaryText: getAssignOperationText(assign.op),
        secondaryText: ''
      };
    }
    if (assign.type === 'dual') {
      return {
        primaryText: getAssignOperationText(assign.primaryOp),
        secondaryText: getAssignOperationText(assign.secondaryOp)
      };
    }
  }
  return {
    primaryText: '',
    secondaryText: ''
  };
}

function getAssignForKeyUnit(keyUnitId: string, isEdit: boolean) {
  const exLayerHold = playerModel.currentLayerId !== 'la0';
  if (!isEdit || exLayerHold) {
    return playerModel.getDynamicKeyAssign(keyUnitId);
  } else {
    return editorModel.getAssignForKeyUnit(keyUnitId);
  }
}

function makeKeyUnitCardViewModel(
  kp: IKeyUnitEntry,
  isEdit: boolean
): IKeyUnitCardViewModel {
  const keyUnitId = kp.id;
  const pos = { x: kp.x, y: kp.y, r: kp.r };

  const { isKeyUnitCurrent, setCurrentKeyUnitId } = editorModel;

  const isCurrent = isKeyUnitCurrent(keyUnitId);
  const setCurrent = () => setCurrentKeyUnitId(keyUnitId);
  const assign = getAssignForKeyUnit(keyUnitId, isEdit);
  const { primaryText, secondaryText } = getAssignEntryTexts(assign);

  const isHold = appDomain.playerModel.keyStates[kp.id];

  return {
    keyUnitId,
    pos,
    isCurrent,
    setCurrent,
    primaryText,
    secondaryText,
    isHold
  };
}

export function makeKeyUnitCardsPartViewModel(
  isEdit: boolean
): IKeyUnitCardPartViewModel {
  return {
    cards: editorModel.keyPositions.map((kp) =>
      makeKeyUnitCardViewModel(kp, isEdit)
    )
  };
}
