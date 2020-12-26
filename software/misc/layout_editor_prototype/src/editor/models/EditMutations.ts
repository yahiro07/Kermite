import { clamp } from '~/base/utils';
import { IModeState } from '~/editor/models/AppState';
import { IEditPropKey, IKeyEntity } from '~/editor/models/DataSchema';
import { editReader } from '~/editor/models/EditReader';
import { editUpdator } from '~/editor/models/EditUpdator';
import {
  changePlacementCoordUnit,
  mmToUnitValue,
  unitValueToMm,
} from '~/editor/models/PlacementUnitHelper';

export const editMutations = new (class {
  startEdit = (useGhost: boolean = true) => {
    editUpdator.startEditSession(useGhost);
  };

  endEdit = () => {
    editUpdator.endEditSession();
  };

  addKeyEntity(x: number, y: number) {
    const id = `ke-${(Math.random() * 1000) >> 0}`;
    const keyEntity: IKeyEntity = {
      id,
      keyId: id,
      x,
      y,
      r: 0,
      shape: 'std 1',
      keyIndex: -1,
    };
    editUpdator.commitEditor((editor) => {
      editor.design.keyEntities[id] = keyEntity;
      editor.currentkeyEntityId = id;
    });
  }

  setPlacementUnit(unitSpec: string) {
    editUpdator.commitEditor((editor) => {
      changePlacementCoordUnit(editor.design, unitSpec);
    });
  }

  setMode<K extends 'editorTarget' | 'editMode'>(
    fieldKey: K,
    mode: IModeState[K]
  ) {
    editUpdator.patchEditor((state) => {
      state[fieldKey] = mode as any;
    });
  }

  setBoolOption<K extends 'showAxis' | 'showGrid' | 'snapToGrid'>(
    fieldKey: K,
    value: boolean
  ) {
    editUpdator.patchEnvState((env) => {
      env[fieldKey] = value;
    });
  }

  setCurrentKeyEntity(keyEntityId: string | undefined) {
    editUpdator.patchEditor((editor) => {
      editor.currentkeyEntityId = keyEntityId;
    });
  }

  moveKeyDelta(deltaX: number, deltaY: number) {
    editUpdator.patchEditKeyEntity((ke) => {
      ke.x += deltaX;
      ke.y += deltaY;
    });
  }

  setKeyPosition(px: number, py: number) {
    const { coordUnit, snapToGrid, gridPitches } = editReader;
    let [gpx, gpy] = gridPitches;
    gpx /= 4;
    gpy /= 4;

    editUpdator.patchEditKeyEntity((ke) => {
      let [kx, ky] = unitValueToMm(ke.x, ke.y, coordUnit);
      if (snapToGrid) {
        kx = Math.round(px / gpx) * gpx;
        ky = Math.round(py / gpy) * gpy;
      } else {
        kx = px;
        ky = py;
      }
      [ke.x, ke.y] = mmToUnitValue(kx, ky, coordUnit);
    });
  }

  changeKeyProperty = <K extends IEditPropKey>(
    propKey: K,
    value: IKeyEntity[K]
  ) => {
    editUpdator.patchEditKeyEntity((ke) => {
      ke[propKey] = value;
    });
  };

  moveSight(deltaX: number, deltaY: number) {
    editUpdator.patchEnvState((env) => {
      env.sight.pos.x += deltaX;
      env.sight.pos.y += deltaY;
    });
  }

  scaleSight(dir: number, px: number, py: number) {
    editUpdator.patchEnvState((env) => {
      const { sight } = env;
      const sza = 1 + dir * 0.05;
      const oldScale = sight.scale;
      const newScale = clamp(sight.scale * sza, 0.1, 10);
      sight.scale = newScale;
      const scaleDiff = newScale - oldScale;
      sight.pos.x -= px * scaleDiff;
      sight.pos.y -= py * scaleDiff;
    });
  }
})();
