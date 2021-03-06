import { URL } from 'url';
import { glob } from 'glob';
import { fsReadFileSync, fsWriteFileSync } from '~/shell/funcs';

export function setupWebContentSourceChecker(
  webContents: Electron.webContents,
  publicRootPath: string,
) {
  function isUriValidForLocalResources(uri: string) {
    const parsedUrl = new URL(uri);
    return (
      parsedUrl.protocol === 'file:' &&
      parsedUrl.pathname.startsWith(publicRootPath)
    );
  }

  webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isUriValidForLocalResources(navigationUrl)) {
      event.preventDefault();
    }
  });

  webContents.on('new-window', (event, url) => {
    if (!isUriValidForLocalResources(url)) {
      event.preventDefault();
    }
  });
}

export function enumeratePagePaths(baseDir: string): string[] {
  const subPagePaths = glob
    .sync('**/index.html', { cwd: baseDir })
    .map((path) => path.replace('index.html', ''))
    .map((path) => (path === '' && '/') || path);
  return subPagePaths;
}

export function preparePreloadJsFile(preloadFilePath: string) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // dirty patch preload.json to expose isDevelopment
  const preloadText = fsReadFileSync(preloadFilePath, { encoding: 'utf-8' });
  const modPreloadText = preloadText.replace(
    /isDevelopment: (true|false)/g,
    `isDevelopment: ${isDevelopment}`,
  );
  fsWriteFileSync(preloadFilePath, modPreloadText, {
    encoding: 'utf-8',
  });
}
