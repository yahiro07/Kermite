import { app } from 'electron';
import { pathJoin } from '~shared/funcs/Files';

export const appEnv = new (class {
  isDevelopment = process.env.NODE_ENV === 'development';

  resolveUserDataFilePath(relPath: string) {
    const appDataDir = app.getPath('userData');
    return pathJoin(appDataDir, relPath);
  }

  resolveAssetsPath(relPath: string) {
    const appDir = app.getAppPath();
    return pathJoin(appDir, relPath);
  }
})();
