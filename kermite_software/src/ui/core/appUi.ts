export const appUi = new (class {
  private _debugObject?: any;

  // バックエンドから環境変数を取得する場合、グローバルスコープで参照したり、
  // バックエンドから値が帰ってくる前に参照すると正しい値が得られない問題がある
  // 代替としてlocation.protocolでデバッグ実行中かを判定
  // todo: preload.jsでBE-->FEに環境変数を受け渡す?
  isDevelopment = location.protocol === 'http:';

  reqRerender: boolean = false;

  rerender() {
    this.reqRerender = true;
  }

  get debugObject() {
    return this._debugObject;
  }

  setDebugObject(obj: any) {
    this._debugObject = obj;
    this.reqRerender = true;
  }
})();