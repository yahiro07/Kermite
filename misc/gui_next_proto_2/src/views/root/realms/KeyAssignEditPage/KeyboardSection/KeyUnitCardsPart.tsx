import { css } from 'goober';
import { hx } from '~views/basis/qx';
import { UiTheme } from '~views/common/UiTheme';
import {
  IKeyUnitCardViewModel,
  makeKeyUnitCardsPartViewModel,
} from './KeyUnitCardsPart.model';

export function KeyUnitCard({ keyUnit }: { keyUnit: IKeyUnitCardViewModel }) {
  const {
    keyUnitId,
    pos,
    isCurrent,
    setCurrent,
    primaryText,
    secondaryText,
  } = keyUnit;

  const cssKeyRect = css`
    cursor: pointer;
    fill: rgba(0, 0, 0, 0.5);
    &[data-current] {
      fill: ${UiTheme.clSelectHighlight};
    }
  `;

  const cssKeyText = css`
    fill: #fff;
    pointer-events: none;
  `;

  const onMouseDown = (e: MouseEvent) => {
    setCurrent();
    e.stopPropagation();
  };

  const getFontSize = (text: string) => {
    if (text.length <= 3) {
      return '8px';
    } else {
      return '5px';
    }
  };

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.r}) `}
      key={keyUnitId}
    >
      <rect
        x={-9}
        y={-9}
        width={18}
        height={18}
        css={cssKeyRect}
        data-current={isCurrent}
        onMouseDown={onMouseDown}
      />
      <text
        css={cssKeyText}
        x={0}
        y={0}
        font-size={getFontSize(primaryText)}
        text-anchor="middle"
        dominant-baseline="center"
      >
        {primaryText}
      </text>

      <text
        css={cssKeyText}
        x={0}
        y={8}
        font-size={getFontSize(secondaryText)}
        text-anchor="middle"
        dominant-baseline="center"
      >
        {secondaryText}
      </text>
    </g>
  );
}

export function KeyUnitCardsPart() {
  const keyUnitCardsPartViewModel = makeKeyUnitCardsPartViewModel();
  return (
    <g>
      {keyUnitCardsPartViewModel.cards.map((keyUnit) => (
        <KeyUnitCard keyUnit={keyUnit} key={keyUnit.keyUnitId} />
      ))}
    </g>
  );
}