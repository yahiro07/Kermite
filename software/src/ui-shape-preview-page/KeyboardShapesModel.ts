import { IDisplayKeyboardDesign } from '~/shared';
import { getProjectOriginAndIdFromSig } from '~/shared/funcs/DomainRelatedHelpers';
import { ipcAgent } from '~/ui-common';
import { DisplayKeyboardDesignLoader } from '~/ui-common/modules/DisplayKeyboardDesignLoader';
import { projectResourceModel } from '~/ui-common/sharedModels/ProjectResourceModel';
import {
  uiStatusModel,
  UiStatusModel,
} from '~/ui-common/sharedModels/UiStatusModel';

export class KeyboardShapesModel {
  constructor(private uiStatusModel: UiStatusModel) {}

  private _currentProjectSig: string | undefined;
  private _loadedDesign: IDisplayKeyboardDesign | undefined;
  private _currentLayoutName: string | undefined;

  get currentProjectSig() {
    return this._currentProjectSig || '';
  }

  get currentLayoutName() {
    return this._currentLayoutName || '';
  }

  get loadedDesign() {
    return this._loadedDesign;
  }

  get optionProjectInfos() {
    return projectResourceModel.getProjectsWithLayout();
  }

  get optionLayoutNames() {
    const info = this.optionProjectInfos.find(
      (info) => info.sig === this._currentProjectSig,
    );
    return info?.layoutNames || [];
  }

  private async loadCurrentProjectLayout() {
    if (!(this._currentProjectSig && this._currentLayoutName)) {
      return;
    }
    const { origin, projectId } = getProjectOriginAndIdFromSig(
      this._currentProjectSig,
    );
    const design = await ipcAgent.async.projects_loadKeyboardShape(
      origin,
      projectId,
      this._currentLayoutName,
    );
    if (design) {
      this._loadedDesign = DisplayKeyboardDesignLoader.loadDisplayKeyboardDesign(
        design,
      );
    } else {
      this._loadedDesign = undefined;
    }
  }

  setCurrentProjectSig = (sig: string) => {
    if (sig !== this._currentProjectSig) {
      this._currentProjectSig = sig;
      this.uiStatusModel.settings.shapeViewProjectSig = sig;
      this._currentLayoutName = this.optionLayoutNames[0];
      this.loadCurrentProjectLayout();
    }
  };

  setCurrentLayoutName = (layoutName: string) => {
    if (layoutName !== this._currentLayoutName) {
      this._currentLayoutName = layoutName;
      this.uiStatusModel.settings.shapeViewLayoutName = layoutName;
      this.loadCurrentProjectLayout();
    }
  };

  private onLayoutFileUpdated = (args: { projectId: string }) => {
    if (this._currentProjectSig) {
      if (
        args.projectId ===
        getProjectOriginAndIdFromSig(this._currentProjectSig).projectId
      ) {
        this.loadCurrentProjectLayout();
      }
    }
  };

  initialize() {
    ipcAgent.subscribe2(
      'projects_layoutFileUpdationEvents',
      this.onLayoutFileUpdated,
    );

    if (this.optionProjectInfos.length === 0) {
      return;
    }

    this._currentProjectSig =
      this.uiStatusModel.settings.shapeViewProjectSig ||
      this.optionProjectInfos[0].sig;

    this._currentLayoutName =
      this.uiStatusModel.settings.shapeViewLayoutName ||
      this.optionProjectInfos[0].layoutNames[0];

    if (!this.optionLayoutNames.includes(this._currentLayoutName)) {
      this._currentLayoutName = this.optionLayoutNames[0];
    }

    this.loadCurrentProjectLayout();
  }

  finalize() {
    ipcAgent.unsubscribe2(
      'projects_layoutFileUpdationEvents',
      this.onLayoutFileUpdated,
    );
  }
}

export const keyboardShapesModel = new KeyboardShapesModel(uiStatusModel);
