import {
  getRelativeMousePosition,
  IPosition,
  startDragSession,
} from '~/base/UiInteractionHelpers';
import { editMutations, editReader } from '~/editor/models';
import { screenToWorld } from '~/editor/views/EditSvgView/CoordHelpers';
import { DisplayAreaFrame } from '~/editor/views/EditSvgView/DisplayAreaFrame';
import { FieldAxis, FieldGrid } from '~/editor/views/EditSvgView/FieldParts';
import {
  KeyEntityCard,
  startKeyEntityDragOperation,
} from '~/editor/views/EditSvgView/KeyEntityCard';
import { h, rerender } from '~/qx';

function getViewBoxSpec() {
  const { screenW, screenH } = editReader.sight;
  return `0 0 ${screenW} ${screenH}`;
}

function getTransformSpec() {
  const { sight } = editReader;
  const sc = 1 / sight.scale;
  const cx = sight.screenW / 2 - sight.pos.x * sc;
  const cy = sight.screenH / 2 - sight.pos.y * sc;
  return `translate(${cx}, ${cy}) scale(${sc})`;
}

function startSightDragOperation(e: MouseEvent) {
  const { sight } = editReader;

  const moveCallback = (pos: IPosition, prevPos: IPosition) => {
    const deltaX = -(pos.x - prevPos.x) * sight.scale;
    const deltaY = -(pos.y - prevPos.y) * sight.scale;
    editMutations.moveSight(deltaX, deltaY);
    rerender();
  };

  const upCallback = () => {};

  startDragSession(e, moveCallback, upCallback);
}

const onSvgMouseDown = (e: MouseEvent) => {
  if (e.button === 0) {
    const { editorTarget, editMode } = editReader;
    if (editorTarget === 'key') {
      if (editMode === 'select' || editMode === 'move') {
        editMutations.setCurrentKeyEntity(undefined);
      } else if (editMode === 'add') {
        const [sx, sy] = getRelativeMousePosition(e);
        const [x, y] = screenToWorld(sx, sy);
        editMutations.addKeyEntity(x, y);
        startKeyEntityDragOperation(e, false);
      }
    }
  }
  if (e.button === 1) {
    startSightDragOperation(e);
  }
};

const onSvgScroll = (e: WheelEvent) => {
  const { screenW, screenH } = editReader.sight;
  const dir = e.deltaY / 120;
  const [sx, sy] = getRelativeMousePosition(e);
  const px = sx - screenW / 2;
  const py = sy - screenH / 2;
  editMutations.scaleSight(dir, px, py);
};

export const EditSvgView = () => {
  const { ghost, showAxis, showGrid, sight, coordUnit } = editReader;
  const viewBoxSpec = getViewBoxSpec();
  const transformSpec = getTransformSpec();

  return (
    <svg
      width={sight.screenW}
      height={sight.screenH}
      viewBox={viewBoxSpec}
      onMouseDown={onSvgMouseDown}
      onWheel={onSvgScroll}
      id="domEditSvg"
    >
      <g transform={transformSpec}>
        {showGrid && <FieldGrid />}
        {showAxis && <FieldAxis />}
        {ghost && <KeyEntityCard ke={ghost} coordUnit={coordUnit} />}

        <DisplayAreaFrame />

        {editReader.allKeyEntities.map((ke) => (
          <KeyEntityCard ke={ke} key={ke.id} coordUnit={coordUnit} />
        ))}
      </g>
    </svg>
  );
};
