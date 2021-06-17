import { IEditKeyboardDesign, IEditKeyEntity } from './DataSchema';

export type IEditMode = 'select' | 'key' | 'shape' | 'delete';
export interface IEditState {
  loadedDesign: IEditKeyboardDesign;
  design: IEditKeyboardDesign;
  currentkeyEntityId: string | undefined;
  isCurrentKeyMirror: boolean;
  currentShapeId: string | undefined;
  currentPointIndex: number;
  editMode: IEditMode;
  shapeDrawing: boolean;
  currentTransGroupId: string | undefined;
}

export interface ISight {
  pos: {
    x: number;
    y: number;
  };
  scale: number;
  screenW: number;
  screenH: number;
}
export interface IEnvState {
  ghost: IEditKeyEntity | undefined;
  sight: ISight;
  showAxis: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  snapDivision: number;
  showKeyId: boolean;
  showKeyIndex: boolean;
  pressedKeyIndices: number[];
}

export type IEnvBoolPropKey =
  | 'showAxis'
  | 'showGrid'
  | 'snapToGrid'
  | 'showKeyId'
  | 'showKeyIndex';

interface IAppState {
  editor: IEditState;
  env: IEnvState;
}

export function createFallbackEditKeyboardDesign(): IEditKeyboardDesign {
  return {
    setup: {
      placementUnit: 'mm',
      placementAnchor: 'center',
      keySizeUnit: 'KP 19',
      keyIdMode: 'auto',
    },
    keyEntities: {},
    outlineShapes: {},
    transGroups: {
      '0': {
        id: '0',
        x: 0,
        y: 0,
        angle: 0,
        mirror: false,
      },
    },
  };
}

export const appState: IAppState = {
  editor: {
    loadedDesign: createFallbackEditKeyboardDesign(),
    design: createFallbackEditKeyboardDesign(),
    currentkeyEntityId: undefined,
    isCurrentKeyMirror: false,
    currentShapeId: undefined,
    currentPointIndex: -1,
    editMode: 'key',
    shapeDrawing: false,
    currentTransGroupId: undefined,
  },
  env: {
    ghost: undefined,
    sight: {
      pos: {
        x: 0,
        y: 0,
      },
      scale: 0.3,
      screenW: 600,
      screenH: 400,
    },
    showAxis: true,
    showGrid: true,
    snapToGrid: true,
    snapDivision: 4,
    showKeyId: true,
    showKeyIndex: true,
    pressedKeyIndices: [],
  },
};
