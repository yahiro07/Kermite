import { overwriteObjectProps } from '~funcs/Utils';
import { siteModel } from '.';

export type PageSignature = 'editor' | 'shapePreview' | 'firmwareUpdation';

export interface IUiSettings {
  showTestInputArea: boolean;
  page: PageSignature;
  shapeViewBreedName: string;
  shapeViewShowKeyId: boolean;
  shapeViewShowKeyIndex: boolean;
  shapeViewShowBoundingBox: boolean;
}

const defaultUiSettins: IUiSettings = {
  showTestInputArea: false,
  page: 'editor',
  shapeViewBreedName: '',
  shapeViewShowKeyId: false,
  shapeViewShowKeyIndex: false,
  shapeViewShowBoundingBox: false
};

export interface IUiStatus {
  profileConfigModalVisible: boolean;
}

const defaultUiStatus: IUiStatus = {
  profileConfigModalVisible: false
};

export class UiStatusModel {
  readonly settings: IUiSettings = defaultUiSettins;

  readonly status: IUiStatus = defaultUiStatus;

  async initialize() {
    const settingsText = localStorage.getItem('uiSettings');
    if (settingsText) {
      const settings = JSON.parse(settingsText);
      overwriteObjectProps(this.settings, settings);
    }
    if (!siteModel.isDevelopment || !this.settings.page) {
      this.settings.page = 'editor';
    }
  }

  save() {
    const settingsText = JSON.stringify(this.settings);
    localStorage.setItem('uiSettings', settingsText);
  }

  async finalize() {
    this.save();
  }
}