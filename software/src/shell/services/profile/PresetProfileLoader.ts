import {
  IProfileData,
  duplicateObjectByJsonStringifyParse,
  fallbackProfileData,
  IPresetSpec,
  IResourceOrigin,
} from '~/shared';
import { projectResourceProvider } from '~/shell/projects';
import { IPresetProfileLoadingFeature } from '~/shell/projects/interfaces';

export class PresetProfileLoader implements IPresetProfileLoadingFeature {
  private async createBlankProfileFromLayoutFile(
    origin: IResourceOrigin,
    projectId: string,
    layoutName: string,
  ) {
    try {
      const design = await projectResourceProvider.loadProjectLayout(
        origin,
        projectId,
        layoutName,
      );
      if (design) {
        const profileData: IProfileData = duplicateObjectByJsonStringifyParse(
          fallbackProfileData,
        );
        profileData.projectId = projectId;
        profileData.keyboardDesign = design;
        return profileData;
      }
    } catch (error) {
      console.log(`errorr on loading layout file`);
      console.error(error);
    }
  }

  private async loadPresetProfileDataImpl(
    origin: IResourceOrigin,
    projectId: string,
    presetSpec: IPresetSpec,
  ) {
    if (presetSpec.type === 'preset') {
      return await projectResourceProvider.loadProjectPreset(
        origin,
        projectId,
        presetSpec.presetName,
      );
    } else {
      return await this.createBlankProfileFromLayoutFile(
        origin,
        projectId,
        presetSpec.layoutName,
      );
    }
  }

  private profileDataCache: { [key in string]: IProfileData | undefined } = {};

  async loadPresetProfileData(
    origin: IResourceOrigin,
    projectId: string,
    presetSpec: IPresetSpec,
  ): Promise<IProfileData | undefined> {
    const pp = presetSpec as {
      type: string;
      layoutName?: string;
      presetName?: string;
    };
    const profileKey = `${projectId}__${pp.type}__${
      pp.layoutName || pp.presetName || ''
    }`;
    const cache = this.profileDataCache;
    if (profileKey in cache) {
      return cache[profileKey];
    }
    const profile = await this.loadPresetProfileDataImpl(
      origin,
      projectId,
      presetSpec,
    );
    cache[profileKey] = profile;
    return profile;
  }
}
