import { IProfileManagerStatus } from '~contract/data';
import { IProfileManagerCommand } from '~contract/ipc';
import { editorSlice, editorSelectors } from '../editor';
import { sendProfileManagerCommands } from '../ipc';
import { AppState, AsyncDispatch } from '../store';
import { profileSlice } from './profileSlice';

function getSaveCommandIfDirty(
  getState: () => AppState
): IProfileManagerCommand | undefined {
  const editorState = getState().editor;
  const isDirty = editorSelectors.isEditModelDirty(editorState);
  if (isDirty) {
    return { saveCurrentProfile: { editModel: editorState.editModel } };
  }
  return undefined;
}

export const profileAsyncActions = {
  handleProfileManagerStatusEvents(payload: Partial<IProfileManagerStatus>) {
    return async (dispatch: AsyncDispatch) => {
      const {
        currentProfileName,
        allProfileNames,
        loadedEditModel,
        errorMessage
      } = payload;
      if (currentProfileName) {
        dispatch(
          profileSlice.actions.setCurrentProfileName(currentProfileName)
        );
      }
      if (allProfileNames) {
        dispatch(profileSlice.actions.setAllProfileNames(allProfileNames));
      }
      if (loadedEditModel) {
        dispatch(editorSlice.actions.loadEditModel(loadedEditModel));
      }
      if (errorMessage) {
        alert(errorMessage);
      }
    };
  },

  createProfile(name: string) {
    return async (dispatch: AsyncDispatch, getState: () => AppState) => {
      if (getState().profile.allProfileNames.includes(name)) {
        alert(`Profile ${name} already exists. Please specify another name.`);
        return;
      }
      const saveCommand = getSaveCommandIfDirty(getState);
      const createCommand = { creatProfile: { name } };
      sendProfileManagerCommands(saveCommand, createCommand);
    };
  },
  loadProfile(name: string) {
    return async (dispatch: AsyncDispatch, getState: () => AppState) => {
      const curProfName = getState().profile.currentProfileName;
      if (name === curProfName) {
        return;
      }
      const saveCommand = getSaveCommandIfDirty(getState);
      const loadCommand = { loadProfile: { name } };
      sendProfileManagerCommands(saveCommand, loadCommand);
    };
  },
  renameProfile(name: string, newName: string) {
    return async (dispatch: AsyncDispatch, getState: () => AppState) => {
      const saveCommand = getSaveCommandIfDirty(getState);
      const renameCommand = { renameProfile: { name, newName } };
      sendProfileManagerCommands(saveCommand, renameCommand);
    };
  },
  deleteProfile(name: string) {
    return async (dispatch: AsyncDispatch, getState: () => AppState) => {
      const ok = confirm(`Profile ${name} will be deleted. Are you sure?`);
      if (!ok) {
        return;
      }
      const deleteCommand = { deleteProfile: { name } };
      sendProfileManagerCommands(deleteCommand);
    };
  },
  saveProfile() {
    return async (dispatch: AsyncDispatch, getState: () => AppState) => {
      const saveCommand = getSaveCommandIfDirty(getState);
      if (saveCommand) {
        sendProfileManagerCommands(saveCommand);
      }
    };
  }
};