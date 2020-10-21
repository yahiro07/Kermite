import { IpcRenderer } from 'electron';
import { ISynchronousIpcPacket, IBackendAgent } from '~defs/IpcContract';
import { createXpcRenderer } from '~lib/xpc/xpcRenderer';

const ipcRenderer: IpcRenderer = (window as any).ipcRenderer;

export function sendIpcPacketSync(packet: ISynchronousIpcPacket) {
  ipcRenderer.sendSync('synchronousMessage', packet);
}

export function debugTrace(message: string) {
  sendIpcPacketSync({ debugMessage: message });
}

const xpcRenderer = createXpcRenderer((window as any).ipcRenderer);

export const backendAgent = xpcRenderer.getBackendAgent<IBackendAgent>(
  'default'
);

export function dumpXpcSubscriptionsRemained() {
  const codes = xpcRenderer.debugGetAllSubscriptionCodes();
  if (codes.length > 0) {
    debugTrace(`${codes.length} ipc subscription remained`);
    codes.forEach(debugTrace);
  }
}