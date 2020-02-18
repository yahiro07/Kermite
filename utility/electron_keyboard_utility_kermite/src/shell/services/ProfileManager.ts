import { appGlobal } from './appGlobal';
import { Files } from '~funcs/Files';
import { IEditModel, IProfileManagerStatus } from '~contract/data';
import { resolveFilePath } from '~shell/AppConfig';
import { Arrays } from '~funcs/Arrays';
import { duplicateObjectByStringify } from '~funcs/Utils';
import * as path from 'path';
import { Nums } from '~funcs/Nums';
import { IProfileManagerCommand } from '~contract/ipc';

type StatusListener = (partialStatus: Partial<IProfileManagerStatus>) => void;

export const fallbackEditModel: IEditModel = {
  version: 1,
  layers: [
    {
      layerId: 'la0',
      layerName: 'main',
      layerRole: 'main'
    },
    {
      layerId: 'la1',
      layerRole: 'shift',
      layerName: 'shift'
    }
  ],
  keyAssigns: {},
  breedName: '__default'
};

class ProfileManagerCore {
  static getDataFilePath(profName: string): string {
    return resolveFilePath(`data/profiles/${profName}.json`);
  }

  static async ensureProfilesDirectoryExists() {
    const dataDirPath = resolveFilePath('data');
    if (!Files.isExists(dataDirPath)) {
      await Files.createDirectory(dataDirPath);
    }
    const profilesDirPath = resolveFilePath('data/profiles');
    if (!Files.isExists(profilesDirPath)) {
      await Files.createDirectory(profilesDirPath);
    }
  }

  static async listAllProfileNames(): Promise<string[]> {
    const fileNames = await Files.listFiles(resolveFilePath(`data/profiles`));
    return fileNames.map(fname => fname.replace('.json', ''));
  }

  static loadCurrentProfileName(): string | undefined {
    return appGlobal.applicationStorage.getItem('currentProfileName') as
      | string
      | undefined;
  }

  static storeCurrentProfileName(profName: string) {
    appGlobal.applicationStorage.setItem('currentProfileName', profName);
  }

  static async loadProfile(profName: string): Promise<IEditModel> {
    const fpath = this.getDataFilePath(profName);
    return (await Files.readJson(fpath)) as IEditModel;
  }

  static async saveProfile(
    profName: string,
    editModel: IEditModel
  ): Promise<void> {
    const fpath = this.getDataFilePath(profName);
    console.log(`saving current profile to ${path.basename(fpath)}`);
    await Files.writeJson(fpath, editModel);
  }

  static async createProfile(
    profName: string,
    breedName: string
  ): Promise<IEditModel> {
    const editModel: IEditModel = duplicateObjectByStringify(fallbackEditModel);
    editModel.breedName = breedName;
    await this.saveProfile(profName, editModel);
    return editModel;
  }

  static async deleteProfile(profName: string): Promise<void> {
    const fpath = this.getDataFilePath(profName);
    await Files.deleteFile(fpath);
  }

  static async renameProfile(
    profName: string,
    newProfName: string
  ): Promise<void> {
    const srcPath = this.getDataFilePath(profName);
    const dstPath = this.getDataFilePath(newProfName);
    await Files.renameFile(srcPath, dstPath);
  }
}

export class ProfileManager {
  private status: IProfileManagerStatus = {
    currentProfileName: '',
    allProfileNames: [],
    loadedEditModel: undefined,
    errorMessage: ''
  };

  private defaultProfileName = 'default';

  private statusListeners: StatusListener[] = [];

  private savingEditModel: IEditModel | undefined = undefined;

  subscribeStatus(listener: StatusListener) {
    this.statusListeners.push(listener);
    listener(this.status);
  }
  unsubscribeStatus(listener: StatusListener) {
    Arrays.remove(this.statusListeners, listener);
  }

  private setStatus(newStatePartial: Partial<IProfileManagerStatus>) {
    this.status = { ...this.status, ...newStatePartial };
    this.statusListeners.forEach(listener => listener(newStatePartial));
  }

  private async initializeProfileList(): Promise<string[]> {
    const allProfileNames = await ProfileManagerCore.listAllProfileNames();
    if (allProfileNames.length === 0) {
      const profName = this.defaultProfileName;
      await ProfileManagerCore.createProfile(profName, '__default');
      allProfileNames.push(profName);
    }
    return allProfileNames;
  }

  private getInitialProfileName(allProfileNames: string[]): string {
    let profName = ProfileManagerCore.loadCurrentProfileName();
    if (profName && !allProfileNames.includes(profName)) {
      profName = undefined;
    }
    if (!profName) {
      profName = allProfileNames[0];
    }
    return profName;
  }

  async initialize() {
    try {
      await ProfileManagerCore.ensureProfilesDirectoryExists();
      const allProfileNames = await this.initializeProfileList();
      const initialProfileName = this.getInitialProfileName(allProfileNames);
      this.setStatus({ allProfileNames });
      await this.loadProfile(initialProfileName);
    } catch (error) {
      //todo: check various cases
      //todo: check error when data or data/profiles is not exists
    }
  }

  async terminate() {
    await this.executeSaveProfileTask();
    ProfileManagerCore.storeCurrentProfileName(this.status.currentProfileName);
  }

  private fixEditModelData(editModel: IEditModel) {
    if (editModel.layers.length === 0) {
      editModel.layers = duplicateObjectByStringify(fallbackEditModel.layers);
    }
    if (!editModel.breedName) {
      editModel.breedName = 'astelia';
    }
  }

  private raiseErrorMessage(errorMessage: string) {
    this.setStatus({ errorMessage });
  }

  async loadProfile(profName: string): Promise<boolean> {
    try {
      const editModel = await ProfileManagerCore.loadProfile(profName);
      this.fixEditModelData(editModel);
      this.setStatus({
        currentProfileName: profName,
        loadedEditModel: editModel
      });
      return true;
    } catch (error) {
      this.raiseErrorMessage('failed to load profile');
      return false;
    }
  }

  async saveCurrentProfile(editModel: IEditModel): Promise<boolean> {
    try {
      ProfileManagerCore.saveProfile(this.status.currentProfileName, editModel);
      this.setStatus({
        loadedEditModel: editModel
      });
      return true;
    } catch (error) {
      this.raiseErrorMessage('failed to save profile');
      return false;
    }
  }

  reserveSaveProfileTask(prof: IEditModel) {
    //console.log(`reserveSaveProfileTask`)
    this.savingEditModel = prof;
  }

  private async executeSaveProfileTask() {
    //console.log(`execute save profile task ${!!this.savingEditModel}`)
    if (this.savingEditModel) {
      await this.saveCurrentProfile(this.savingEditModel);
      this.savingEditModel = undefined;
      //console.log(`execute save done`)
    }
  }

  async createProfile(profName: string, breedName: string): Promise<boolean> {
    if (this.status.allProfileNames.includes(profName)) {
      return false;
    }
    try {
      const editModel = await ProfileManagerCore.createProfile(
        profName,
        breedName
      );
      const allProfileNames = await ProfileManagerCore.listAllProfileNames();
      this.setStatus({
        allProfileNames,
        currentProfileName: profName,
        loadedEditModel: editModel
      });
      return true;
    } catch (error) {
      this.raiseErrorMessage('failed to create profile');
      return false;
    }
  }

  async deleteProfile(profName: string): Promise<boolean> {
    if (!this.status.allProfileNames.includes(profName)) {
      return false;
    }
    try {
      const isCurrent = this.status.currentProfileName === profName;
      const currentProfileIndex = this.status.allProfileNames.indexOf(profName);
      const isLastOne = this.status.allProfileNames.length === 1;
      await ProfileManagerCore.deleteProfile(profName);
      if (isLastOne) {
        await ProfileManagerCore.createProfile(
          this.defaultProfileName,
          '__default'
        );
      }
      const allProfileNames = await ProfileManagerCore.listAllProfileNames();
      this.setStatus({ allProfileNames });
      if (isCurrent) {
        const newIndex = Nums.clamp(
          currentProfileIndex,
          0,
          this.status.allProfileNames.length - 1
        );
        await this.loadProfile(allProfileNames[newIndex]);
      }
      return true;
    } catch (error) {
      this.raiseErrorMessage('failed to delete profile');
      return false;
    }
  }

  async renameProfile(profName: string, newProfName: string): Promise<boolean> {
    if (!this.status.allProfileNames.includes(profName)) {
      return false;
    }
    if (this.status.allProfileNames.includes(newProfName)) {
      return false;
    }
    try {
      const isCurrent = this.status.currentProfileName === profName;
      await ProfileManagerCore.renameProfile(profName, newProfName);
      const allProfileNames = await ProfileManagerCore.listAllProfileNames();
      this.setStatus({ allProfileNames });
      if (isCurrent) {
        await this.loadProfile(newProfName);
      }
      return true;
    } catch (error) {
      this.raiseErrorMessage('failed to rename profile');
      return false;
    }
  }

  private async executeCommand(cmd: IProfileManagerCommand): Promise<boolean> {
    if (cmd.creatProfile) {
      return await this.createProfile(
        cmd.creatProfile.name,
        cmd.creatProfile.breedName
      );
    } else if (cmd.deleteProfile) {
      return await this.deleteProfile(cmd.deleteProfile.name);
    } else if (cmd.loadProfile) {
      return await this.loadProfile(cmd.loadProfile.name);
    } else if (cmd.renameProfile) {
      return await this.renameProfile(
        cmd.renameProfile.name,
        cmd.renameProfile.newName
      );
    } else if (cmd.saveCurrentProfile) {
      return await this.saveCurrentProfile(cmd.saveCurrentProfile.editModel);
    }
    return false;
  }

  async executeCommands(commands: IProfileManagerCommand[]) {
    for (const cmd of commands) {
      const done = await this.executeCommand(cmd);
      if (!done) {
        return;
      }
    }
  }
}