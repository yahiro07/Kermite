import { css } from 'goober';
import { h } from '~lib/qx';
import { editorModel, uiStatusModel } from '~ui/models';
import {
  ClosableOverlay,
  CommonDialogFrame
} from '~ui/views/base/dialog/CommonDialogParts';
import { AssignTypeSelectionPart } from './AssignTypeSelectionPart';
import { DualModeSettingsPart } from './DualModeSettingsPart';

export const ProfileConfigurationPart = () => {
  const cssBase = css`
    padding: 5px;
  `;

  const currentAssignType = editorModel.profileData.assignType;

  return <div css={cssBase}>assign model: {currentAssignType}</div>;
};

export const ProfileConfigratuionModalLayer = () => {
  const uiStatus = uiStatusModel.status;
  const visible = uiStatus.profileConfigModalVisible;
  const closeModal = () => {
    uiStatus.profileConfigModalVisible = false;
  };

  if (!visible) {
    return null;
  }

  const cssDialogContent = css`
    margin: 10px;
    color: black;
    min-height: 140px;
  `;

  return (
    <ClosableOverlay close={closeModal}>
      <CommonDialogFrame caption="profile configuration">
        <div css={cssDialogContent}>
          <AssignTypeSelectionPart />
          <DualModeSettingsPart />
        </div>
      </CommonDialogFrame>
    </ClosableOverlay>
  );
};