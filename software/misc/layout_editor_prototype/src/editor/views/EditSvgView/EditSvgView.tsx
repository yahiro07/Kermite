import { css } from 'goober';
import { makeCssColor } from '~/base/ColorHelper';
import {
  getRelativeMousePosition,
  IPosition,
  startDragSession,
} from '~/base/UiInteractionHelpers';
import { editMutations, editReader } from '~/editor/models';
import { DebugOverlay } from '~/editor/views/DebugOverlay';
import {
  KeyEntityCard,
  startKeyEntityDragOperation,
} from '~/editor/views/EditSvgView/KeyEntityCard';
import { h, Hook, rerender } from '~/qx';

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

function screenToWorld(sx: number, sy: number) {
  const { sight } = editReader;
  const x = (sx - sight.screenW / 2) * sight.scale + sight.pos.x;
  const y = (sy - sight.screenH / 2) * sight.scale + sight.pos.y;
  return [x, y];
}

const axisColor = makeCssColor(0x444444, 0.2);
const gridColor = makeCssColor(0x444444, 0.1);

function getWorldViewBounds() {
  const { sight } = editReader;
  const d = 1;
  const ew = (sight.screenW / 2) * sight.scale;
  const eh = (sight.screenH / 2) * sight.scale;
  const left = -ew + sight.pos.x + d;
  const top = -eh + sight.pos.y + d;
  const right = ew + sight.pos.x - d;
  const bottom = eh + sight.pos.y - d;
  return {
    left,
    top,
    right,
    bottom,
  };
}

const FieldAxis = () => {
  const { left, top, right, bottom } = getWorldViewBounds();
  return (
    <g>
      <line
        x1={left}
        y1={0}
        x2={right}
        y2={0}
        stroke={axisColor}
        stroke-width={0.5}
      />
      <line
        x1={0}
        y1={top}
        x2={0}
        y2={bottom}
        stroke={axisColor}
        stroke-width={0.5}
      />
    </g>
  );
};

function makeRange(lo: number, hi: number) {
  return new Array(hi - lo + 1).fill(0).map((_, i) => lo + i);
}

const FieldGrid = () => {
  const { left, top, right, bottom } = getWorldViewBounds();
  const [gpx, gpy] = editReader.gridPitches;

  const nl = (left / gpx) >> 0;
  const nt = (top / gpy) >> 0;
  const nr = (right / gpx) >> 0;
  const nb = (bottom / gpy) >> 0;

  const xs = makeRange(nl, nr).map((ix) => ix * gpx);
  const ys = makeRange(nt, nb).map((iy) => iy * gpy);

  return (
    <g>
      <g>
        {ys.map((y) => (
          <line
            key={y}
            x1={left}
            y1={y}
            x2={right}
            y2={y}
            stroke={gridColor}
            stroke-width={0.5}
          />
        ))}
      </g>
      <g>
        {xs.map((x) => (
          <line
            key={x}
            x1={x}
            y1={top}
            x2={x}
            y2={bottom}
            stroke={gridColor}
            stroke-width={0.5}
          />
        ))}
      </g>
    </g>
  );
};

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

const EditSvgViewInternal = () => {
  const { sight } = editReader;

  const viewBoxSpec = getViewBoxSpec();
  const transformSpec = getTransformSpec();
  const { ghost, showAxis, showGrid } = editReader;

  const { coordUnit } = editReader;

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

        {editReader.allKeyEntities.map((ke) => (
          <KeyEntityCard ke={ke} key={ke.id} coordUnit={coordUnit} />
        ))}
      </g>
    </svg>
  );
};

export const EditSvgView = () => {
  const cssSvgView = css`
    border: solid 1px #888;
    flex-grow: 1;
    overflow: hidden;
    position: relative;
    > svg {
      position: absolute;
    }
  `;

  const { screenW, screenH } = editReader.sight;

  Hook.useSideEffect(() => {
    const el = document.getElementById('domEditSvgOuterDiv');
    if (el) {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (!(cw === screenW && ch === screenH)) {
        editMutations.setEditScreenSize(cw, ch);
        return true;
      }
    }
  });

  return (
    <div css={cssSvgView} id="domEditSvgOuterDiv">
      <EditSvgViewInternal />
      <DebugOverlay />
    </div>
  );
};
