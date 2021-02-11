import { css } from 'goober';
import { FC, h } from 'qx';

interface IButtonBase {
  onClick?(): void;
  disabled?: boolean;
  extraCss?: string;
  className?: string;
  children?: any;
}

const baseCss = css`
  font-size: 15px;
  cursor: pointer;
  user-select: none;
  display: flex;
  justify-content: center;
  align-items: center;

  &:hover {
    opacity: 0.8;
  }

  &.disabled {
    pointer-events: none;
    cursor: inherit;
    opacity: 0.5;
  }
`;

export const ButtonBase: FC<IButtonBase> = ({
  onClick,
  disabled,
  extraCss,
  className,
  children,
}) => (
  <div
    classNames={[baseCss, extraCss, (disabled && 'disabled') || '', className]}
    onClick={onClick}
  >
    {children}
  </div>
);
