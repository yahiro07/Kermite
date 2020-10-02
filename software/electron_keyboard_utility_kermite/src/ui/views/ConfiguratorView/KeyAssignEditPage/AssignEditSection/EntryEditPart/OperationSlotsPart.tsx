import { css } from 'goober';
import { h } from '~lib/qx';
import { makeOperationSlotsPartViewModel } from './OperationSlotsPart.model';
import { uiTheme } from '~ui/core';

function OperationSlotCard(props: {
  text: string;
  isCurrent: boolean;
  setCurrent(): void;
}) {
  const cssSlotCard = css`
    width: 28px;
    height: 28px;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    background: ${uiTheme.colors.clAssignCardFace};
    color: ${uiTheme.colors.clAssignCardText};

    &[data-current] {
      background: ${uiTheme.colors.clSelectHighlight};
    }
  `;
  return (
    <div
      css={cssSlotCard}
      data-current={props.isCurrent}
      onClick={props.setCurrent}
    >
      {props.text}
    </div>
  );
}

export function OerationSlotsPart() {
  const operationSlotsPartViewModel = makeOperationSlotsPartViewModel();

  const cssBox = css`
    > * {
      margin: 2px;
    }
    > * + * {
      margin-top: 4px;
    }
    margin-right: 6px;
  `;

  return (
    <div css={cssBox}>
      {operationSlotsPartViewModel.slots.map((slot, index) => (
        <OperationSlotCard
          key={index}
          text={slot.text}
          isCurrent={slot.isCurrent}
          setCurrent={slot.setCurrent}
        />
      ))}
    </div>
  );
}
