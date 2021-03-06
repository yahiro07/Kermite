import { FC, jsx, css } from 'qx';

interface Props {
  onClick?(): void;
  disabled?: boolean;
  extraCss?: string;
  className?: string;
  children?: any;
  active?: boolean;
  hint?: string;
}

const style = css`
  font-size: 15px;
  cursor: pointer;
  user-select: none;
  display: flex;
  justify-content: center;
  align-items: center;

  &:hover {
    opacity: 0.7;
  }

  &.disabled {
    /* pointer-events: none; */
    cursor: inherit;
    opacity: 0.5;
  }
`;

export const ButtonBase: FC<Props> = ({
  onClick,
  disabled,
  extraCss,
  className,
  children,
  active,
  hint,
}) => (
  <div
    classNames={[
      style,
      extraCss,
      (disabled && 'disabled') || undefined,
      (active && 'active') || undefined,
      className,
    ]}
    onClick={(!disabled && onClick) || undefined}
    data-hint={hint}
  >
    {children}
  </div>
);
