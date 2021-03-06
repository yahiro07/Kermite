import { jsx, css, FC } from 'qx';
import { ISelectorSource, texts } from '~/ui/common/base';
import { GeneralButton, GeneralSelector } from '~/ui/common/components/atoms';

interface Props {
  selectorSource: ISelectorSource;
  isLinkButtonActive: boolean;
  linkButtonHandler(): void;
  hint?: string;
}

const style = css`
  display: flex;
`;

export const KeyboardProjectSelector: FC<Props> = (props) => (
  <div css={style}>
    <GeneralSelector {...props.selectorSource} width={170} hint={props.hint} />
    <GeneralButton
      icon="fa fa-link"
      disabled={!props.isLinkButtonActive}
      onClick={props.linkButtonHandler}
      size="unitSquare"
      hint={texts.hint_presetBrowser_projectLinkButton}
    />
  </div>
);
