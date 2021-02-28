import { h, Hook } from 'qx';
import { IProjectResourceInfo } from '~/shared';
import {
  fieldSetter,
  ipcAgent,
  ISelectorOption,
  reflectFieldValue,
  useFetcher,
  useLocal,
  useMemoEx,
} from '~/ui-common';
import { GeneralSelector } from '~/ui-common/components';
import {
  ClosableOverlay,
  CommonDialogFrame,
  DialogButton,
  DialogButtonsRow,
  DialogContentRow,
} from '~/ui-common/fundamental/dialog/CommonDialogParts';
import { createModal } from '~/ui-common/fundamental/overlay/ForegroundModalLayer';
import {
  cssCommonPropertiesTable,
  cssCommonTextInput,
} from '~/ui-editor-page/components/controls/CommonStyles';

interface ICreateProfileDialogEditValues {
  profileName: string;
  projectKey: string;
  layoutKey: string;
}

const ProfileSetupModalContent = (props: {
  editValues: ICreateProfileDialogEditValues;
  projectOptions: ISelectorOption[];
  layoutOptions: ISelectorOption[];
  canSubmit: boolean;
  submit(): void;
  close(): void;
}) => {
  const {
    editValues,
    submit,
    close,
    projectOptions,
    layoutOptions,
    canSubmit,
  } = props;
  return (
    <ClosableOverlay close={close}>
      <CommonDialogFrame caption="Create Profile" close={close}>
        <DialogContentRow>
          <table css={cssCommonPropertiesTable}>
            <tbody>
              <tr>
                <td>Profile Name</td>
                <td>
                  <input
                    type="text"
                    css={cssCommonTextInput}
                    value={editValues.profileName}
                    onInput={reflectFieldValue(editValues, 'profileName')}
                  />
                </td>
              </tr>
              <tr>
                <td>Target Keyboard</td>
                <td>
                  <GeneralSelector
                    options={projectOptions}
                    value={editValues.projectKey}
                    setValue={fieldSetter(editValues, 'projectKey')}
                    width={150}
                  />
                </td>
              </tr>
              <tr>
                <td>Layout</td>
                <td>
                  <GeneralSelector
                    options={layoutOptions}
                    value={editValues.layoutKey}
                    setValue={fieldSetter(editValues, 'layoutKey')}
                    width={150}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </DialogContentRow>
        <DialogButtonsRow>
          <DialogButton onClick={submit} disabled={!canSubmit}>
            OK
          </DialogButton>
        </DialogButtonsRow>
      </CommonDialogFrame>
    </ClosableOverlay>
  );
};

interface IProfileSetupModalViewModel {
  projectOptions: ISelectorOption[];
  layoutOptions: ISelectorOption[];
  editValues: ICreateProfileDialogEditValues;
  canSubmit: boolean;
}

function makeProjectOptions(infos: IProjectResourceInfo[]): ISelectorOption[] {
  return infos
    .filter((info) => info.layoutNames.length > 0)
    .map((info) => ({
      value: info.sig,
      label: info.projectPath,
    }));
}

function makeLayoutOptions(
  resouceInfos: IProjectResourceInfo[],
  projectSig: string,
): ISelectorOption[] {
  const info = resouceInfos.find((info) => info.sig === projectSig);
  return info?.layoutNames.map((it) => ({ value: it, label: it })) || [];
}

function useProfileSetupModalViewModel(): IProfileSetupModalViewModel {
  const editValues = useLocal({
    profileName: '',
    projectKey: '',
    layoutKey: '',
  });

  const resourceInfos = useFetcher(
    ipcAgent.async.projects_getAllProjectResourceInfos,
    [],
  );
  const projectOptions = useMemoEx(makeProjectOptions, [resourceInfos]);

  const layoutOptions = useMemoEx(makeLayoutOptions, [
    resourceInfos,
    editValues.projectKey,
  ]);

  Hook.useEffect(() => {
    editValues.projectKey = projectOptions[0]?.value || '';
  }, [projectOptions]);

  Hook.useEffect(() => {
    editValues.layoutKey = layoutOptions[0]?.value || '';
  }, [layoutOptions]);

  const canSubmit =
    (!!editValues.profileName &&
      !!editValues.projectKey &&
      !!editValues.layoutKey) ||
    false;

  return {
    projectOptions,
    layoutOptions,
    editValues,
    canSubmit,
  };
}

export const callProfileSetupModal = createModal(() => {
  return (props: {
    close: (result: ICreateProfileDialogEditValues | undefined) => void;
  }) => {
    const vm = useProfileSetupModalViewModel();
    const submit = () => props.close(vm.editValues);
    const close = () => props.close(undefined);
    return (
      <ProfileSetupModalContent
        editValues={vm.editValues}
        projectOptions={vm.projectOptions}
        layoutOptions={vm.layoutOptions}
        canSubmit={vm.canSubmit}
        submit={submit}
        close={close}
      />
    );
  };
});
