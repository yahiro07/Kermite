import { css } from 'goober';
import { h } from 'qx';
import { uiTheme } from '~/ui-common/base';
import { ButtonBase } from '~/ui-common/components/controls';

export const SmallSymbolicActionButton = (props: {
  onClick?(): void;
  disabled?: boolean;
  icon: string;
}) => {
  const style = css`
    width: 20px;
    height: 20px;
    color: ${uiTheme.colors.clPrimary};
    font-size: 18px;
  `;
  return (
    <ButtonBase
      onClick={props.onClick}
      disabled={props.disabled}
      extraCss={style}
    >
      <i class={props.icon} />
    </ButtonBase>
  );
};

export const OperationButtonWithIcon = (props: {
  onClick?(): void;
  disabled?: boolean;
  icon: string;
  label: string;
}) => {
  const style = css`
    color: ${uiTheme.colors.clPrimary};
    font-size: 22px;
    font-weight: bold;
    > span {
      margin-left: 2px;
    }
  `;
  return (
    <ButtonBase
      onClick={props.onClick}
      disabled={props.disabled}
      extraCss={style}
    >
      <i class={props.icon} />
      <span>{props.label}</span>
    </ButtonBase>
  );
};

export const OperationButtonOnlyIcon = (props: {
  onClick?(): void;
  disabled?: boolean;
  icon: string;
}) => {
  const style = css`
    color: ${uiTheme.colors.clPrimary};
    font-size: 24px;
  `;
  return (
    <ButtonBase
      onClick={props.onClick}
      disabled={props.disabled}
      extraCss={style}
    >
      <i class={props.icon} />
    </ButtonBase>
  );
};
