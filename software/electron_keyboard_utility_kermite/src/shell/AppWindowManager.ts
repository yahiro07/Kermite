import { BrowserWindow, Menu, Tray } from 'electron';
import * as path from 'path';
import { environmentConfig } from '~shell/AppEnvironment';

export class AppWindowManager {
  private mainWindow: BrowserWindow | null = null;

  openMainWindow() {
    const options: Electron.BrowserWindowConstructorOptions = {
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js')
      }
    };

    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      options.frame = false;
      options.transparent = true;
      options.hasShadow = false;
    }

    this.mainWindow = new BrowserWindow(options);

    if (environmentConfig.isDevelopment) {
      this.mainWindow.loadURL('http://localhost:3700');
      this.mainWindow?.webContents.openDevTools();
    } else {
      this.mainWindow.loadURL(`file://${__dirname}/xui/index.html`);
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  closeMainWindow() {
    this.mainWindow?.close();
  }

  minimizeMainWindow() {
    this.mainWindow?.minimize();
  }

  private _isMaximized = false;

  maximizeMainWindow() {
    if (this.mainWindow) {
      // const isMaximized = this.mainWindow.isMaximized()
      //...always returns false for transparent window

      if (this._isMaximized) {
        this.mainWindow.unmaximize();
        this._isMaximized = false;
      } else {
        this.mainWindow.maximize();
        this._isMaximized = true;
      }
    }
  }

  private _winHeight = 800;

  adjustWindowSize(isWidgetMode: boolean) {
    if (this.mainWindow) {
      const [w, h] = this.mainWindow.getSize();

      if (isWidgetMode) {
        this._winHeight = h;
        //todo: 現在選択されているプロファイルのキーボード形状データから縦横比を計算
        const asr = 0.4;
        const [w1, h1] = [w, (w * asr) >> 0];
        this.mainWindow.setSize(w1, h1);
        this.mainWindow.setAlwaysOnTop(true);
      } else {
        const [w1, h1] = [w, this._winHeight];
        this.mainWindow.setSize(w1, h1);
        this.mainWindow.setAlwaysOnTop(false);
      }
    }
  }
}

export const appWindowManager = new AppWindowManager();
