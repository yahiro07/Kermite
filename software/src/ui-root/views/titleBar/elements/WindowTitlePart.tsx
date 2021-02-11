import { css } from 'goober';
import { h } from 'qx';

export const WindowTitlePart = () => {
  const cssTitlePart = css`
    display: flex;
    margin-left: 10px;

    > .text {
      font-size: 20px;
      /* font-weight: bold; */
      color: #fff;

      &.K {
        color: #dbff00;
      }
    }
  `;
  return (
    <div css={cssTitlePart}>
      {/* <img className="icon" src="appicon.png" /> */}
      <span className="text K">K</span>
      <span className="text">ermite</span>
    </div>
  );
};
