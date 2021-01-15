import { uiTheme } from '@ui-common';
import { css } from 'goober';
import { h } from 'qx';
import { mvvmView } from '~/base/helper/mvvmHelpers';
import { IPresetKeyUnitViewModel } from '~/viewModels/KeyUnitCard/PresetKeyUnitViewModelCreator';

const cssKeyRect = css`
  fill: transparent;
  stroke: #444;
  stroke-width: 0.3;
`;

const cssKeyText = css`
  font-size: 5px;
  fill: ${uiTheme.colors.clAltText};
  text-anchor: middle;
`;

export const PresetKeyUnitCard = mvvmView((ku: IPresetKeyUnitViewModel) => {
  const { keyUnitId, pos, primaryText, secondaryText, isLayerFallback } = ku;

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.r}) `}
      key={keyUnitId}
    >
      <rect x={-9} y={-9} width={18} height={18} css={cssKeyRect} />

      <text css={cssKeyText} x={0} y={-2} qxIf={!isLayerFallback}>
        {primaryText}
      </text>

      <text css={cssKeyText} x={0} y={4} qxIf={!isLayerFallback}>
        {secondaryText}
      </text>
    </g>
  );
});
