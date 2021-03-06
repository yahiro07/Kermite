import { Hook } from 'qx';
import { ipcAgent, ThemeKey, uiThemeConfigLoader } from '~/ui/common';

interface IThemeSelectionModel {
  currentThemeKey: ThemeKey;
  // themeOptions: ThemeKey[];
  changeTheme(themeKey: ThemeKey): void;
}

export function useThemeSelectionModel(): IThemeSelectionModel {
  const currentThemeKey = Hook.useMemo(uiThemeConfigLoader.loadThemeKey, []);
  return {
    currentThemeKey,
    // themeOptions: Object.keys(themeColors) as ThemeKey[],
    changeTheme: (themeKey: ThemeKey) => {
      if (themeKey !== currentThemeKey) {
        uiThemeConfigLoader.saveThemeKey(themeKey);
        // location.reload(); // Windowsの場合にうまくリロードされずにページが真っ白になってしまう問題がある
        ipcAgent.async.window_reloadPage();
      }
    },
  };
}
