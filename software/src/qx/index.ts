import { jsx } from 'qx/qxinternal_petit_dom/h';
import {
  applyGlobalStyle,
  css,
  setJsxCreateElementFunction,
  styled,
} from './cssInJs';
import { qxGlobal } from './qxGlobal';
import { render as petitDomRender } from './qxinternal_petit_dom';
import { Hook } from './qxinternal_petit_dom/hookImpl';
import { VNode } from './qxinternal_petit_dom/types';
import { setShortCssProcessor } from './shortCss';

export { jsx, Hook, css, styled, applyGlobalStyle, setShortCssProcessor };

export type FC<T extends {} = {}> = (props: T) => JSX.Element | null;
export type QxChild = JSX.Element | string;
export type QxChildren = QxChild | QxChild[];

setJsxCreateElementFunction(jsx);

export function rerender() {
  qxGlobal.rerender();
}

export function asyncRerender() {
  qxGlobal.asyncRerenderFlag = true;
}

let asyncLoopInitialized = false;
function setupAsyncRenderLoop() {
  if (!asyncLoopInitialized) {
    function asyncRenderLoop() {
      if (qxGlobal.asyncRerenderFlag) {
        qxGlobal.rerender();
        qxGlobal.asyncRerenderFlag = false;
      }
      requestAnimationFrame(asyncRenderLoop);
    }
    asyncRenderLoop();
    asyncLoopInitialized = true;
  }
}

export function render(
  renderFn: () => JSX.Element,
  parentDomNode: HTMLElement | null,
) {
  const executeRender = () => {
    // console.log(`--------render start--------`);
    const d = qxGlobal.debug;
    d.nAll = 0;
    d.nUpdated = 0;
    d.nPatchCall = 0;
    const t0 = performance.now();
    petitDomRender(renderFn() as VNode, parentDomNode!);
    const t1 = performance.now();
    if (0) {
      const dur = t1 - t0;
      const nel = document.getElementsByTagName('*').length;
      console.log(
        `render c${d.nUpdated}/${d.nAll}, ` +
          `p${d.nPatchCall}, n${nel}, ${dur.toFixed(2)}ms`,
      );
      // render stats
      // c: component patched count,
      // p: component/element patch count
      // n: dom nodes count
      // ms: time elapsed
    }
    qxGlobal.hookEffectFuncs.forEach((func) => func());
    qxGlobal.hookEffectFuncs = [];
    // if (qxGlobal.hookRerenderFlag) {
    //   qxGlobal.hookRerenderFlag = false;
    //   requestAnimationFrame(executeRender);
    // }
  };

  qxGlobal.rerender = executeRender;
  executeRender();
  setupAsyncRenderLoop();
}
