import { IPresetSelectionModel } from '~/ui/preset-browser-page/models';
import {
  IPresetKeyboardSectionViewModel,
  usePresetKeyboardSectionViewModel,
} from '~/ui/preset-browser-page/viewModels/PresetKeyboardSectionViewModel';
import {
  IPresetSelectionSectionViewModel,
  usePresetSelectionSectionViewModel,
} from '~/ui/preset-browser-page/viewModels/PresetSelectionSectionViewModel';

export interface IPresetBrowserViewModel {
  presetSelectionSectionViewModel: IPresetSelectionSectionViewModel;
  presetKeyboardSectionViewModel: IPresetKeyboardSectionViewModel;
}

export function usePresetBrowserViewModel(
  model: IPresetSelectionModel,
): IPresetBrowserViewModel {
  const presetSelectionSectionViewModel = usePresetSelectionSectionViewModel(
    model,
  );
  const presetKeyboardSectionViewModel = usePresetKeyboardSectionViewModel(
    model.loadedProfileData,
  );
  return {
    presetSelectionSectionViewModel,
    presetKeyboardSectionViewModel,
  };
}
