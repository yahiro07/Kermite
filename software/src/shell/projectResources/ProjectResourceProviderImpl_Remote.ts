import {
  IPersistKeyboardDesign,
  IProfileData,
  IProjectCustomDefinition,
  IProjectResourceInfo,
} from '~/shared';
import { createProjectSig } from '~/shared/funcs/DomainRelatedHelpers';
import { appEnv } from '~/shell/base';
import {
  cacheRemoteResouce,
  fetchJson,
  fetchText,
  fsxMkdirpSync,
  fsxWriteFile,
  pathBasename,
  pathDirname,
} from '~/shell/funcs';
import { LayoutFileLoader } from '~/shell/loaders/LayoutFileLoader';
import { ProfileFileLoader } from '~/shell/loaders/ProfileFileLoader';
import { IProjectResourceProviderImpl } from '~/shell/projectResources';
import { IPorjectFileJson } from '~/shell/projectResources/ProjectResourceProviderImpl_Local';
import { GlobalSettingsProvider } from '~/shell/services/config/GlobalSettingsProvider';

const remoteBaseUri =
  'https://raw.githubusercontent.com/yahiro07/KermiteResourceStore/master/resources';

interface IRemoteProjectResourceInfoSource {
  projectId: string;
  keyboardName: string;
  projectPath: string;
  layoutNames: string[];
  presetNames: string[];
  hasHexFile: boolean;
  firmwareBuildRevision: number;
}

interface ISummaryJsonData {
  info: {
    buildStats: {
      numSuccess: number;
      numTotal: number;
    };
    environment: {
      OS: string;
      'avr-gcc': string;
      make: string;
    };
    updateAt: string;
    filesRevision: number;
  };
  projects: {
    projectPath: string;
    projectId: string;
    keyboardName: string;
    buildStatus: 'success' | 'failure';
    revision: number;
    updatedAt: string;
    hexFileSize: number;
    layoutNames: string[];
    presetNames: string[];
  }[];
}

async function loadRemoteResourceInfosFromSummaryJson(): Promise<
  IRemoteProjectResourceInfoSource[]
> {
  const remoteSummary = await cacheRemoteResouce<ISummaryJsonData>(
    fetchJson,
    `${remoteBaseUri}/summary.json`,
  );
  return remoteSummary.projects.map((info) => ({
    projectId: info.projectId,
    keyboardName: info.keyboardName,
    projectPath: info.projectPath,
    layoutNames: info.layoutNames,
    presetNames: info.presetNames,
    hasHexFile: info.buildStatus === 'success',
    firmwareBuildRevision: info.revision,
  }));
}

export class ProjectResourceProviderImpl_Remote
  implements IProjectResourceProviderImpl {
  private projectInfoSources: IRemoteProjectResourceInfoSource[] = [];

  private loaded = false;
  async getAllProjectResourceInfos(): Promise<IProjectResourceInfo[]> {
    const globalSetttings = GlobalSettingsProvider.getGlobalSettings();
    if (!globalSetttings.useOnlineResources) {
      return [];
    }
    if (!this.loaded) {
      this.projectInfoSources = await loadRemoteResourceInfosFromSummaryJson();
      this.loaded = true;
    }
    return this.projectInfoSources.map((it) => ({
      sig: createProjectSig('online', it.projectId),
      origin: 'online',
      projectId: it.projectId,
      keyboardName: it.keyboardName,
      projectPath: it.projectPath,
      presetNames: it.presetNames,
      layoutNames: it.layoutNames,
      hasFirmwareBinary: it.hasHexFile,
      firmwareBuildRevision: it.firmwareBuildRevision,
    }));
  }

  private getProjectInfoSourceById(
    projectId: string,
  ): IRemoteProjectResourceInfoSource | undefined {
    return this.projectInfoSources.find((info) => info.projectId === projectId);
  }

  async getProjectCustomDefinition(
    projectId: string,
  ): Promise<IProjectCustomDefinition | undefined> {
    const info = this.getProjectInfoSourceById(projectId);
    if (info) {
      const relPath = `variants/${info.projectPath}/project.json`;
      const uri = `${remoteBaseUri}/${relPath}`;
      const projectJsonContent = await cacheRemoteResouce<IPorjectFileJson>(
        fetchJson,
        uri,
      );
      return {
        customParameterSpecs: projectJsonContent.customParameters,
      };
    }
  }

  async loadProjectPreset(
    projectId: string,
    presetName: string,
  ): Promise<IProfileData | undefined> {
    const info = this.getProjectInfoSourceById(projectId);
    if (info) {
      const relPath = `variants/${info.projectPath}/profiles/${presetName}.profile.json`;
      const uri = `${remoteBaseUri}/${relPath}`;
      return await ProfileFileLoader.loadProfileFromUri(uri);
    }
  }

  async loadProjectLayout(
    projectId: string,
    layoutName: string,
  ): Promise<IPersistKeyboardDesign | undefined> {
    const info = this.getProjectInfoSourceById(projectId);
    if (info) {
      const relPath = `variants/${info.projectPath}/${layoutName}.layout.json`;
      const uri = `${remoteBaseUri}/${relPath}`;
      return await LayoutFileLoader.loadLayoutFromUri(uri);
    }
  }

  async loadProjectFirmwareFile(
    projectId: string,
  ): Promise<string | undefined> {
    // リモートからHexファイルを取得後、ローカルに一時ファイルとして保存してファイルパスを返す
    const info = this.getProjectInfoSourceById(projectId);
    if (info) {
      const coreName = pathBasename(info.projectPath);
      const relPath = `variants/${info.projectPath}/${coreName}.hex`;
      const uri = `${remoteBaseUri}/${relPath}`;
      const hexFileContent = await cacheRemoteResouce(fetchText, uri);
      const localFilePath = appEnv.resolveTempFilePath(
        `remote_resources/${relPath}`,
      );
      fsxMkdirpSync(pathDirname(localFilePath));
      await fsxWriteFile(localFilePath, hexFileContent);
      return localFilePath;
    }
  }
}
