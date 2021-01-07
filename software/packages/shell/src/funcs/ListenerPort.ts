import { removeArrayItems } from '@kermite/shared';

type IListener<T> = (payload: T) => void;
export interface IListnerPort<T> {
  (listener: IListener<T>): () => void;
  emit(payload: T): void;
}

export function makeListnerPort<T>(): IListnerPort<T> {
  const listeners: IListener<T>[] = [];
  const func = (listener: IListener<T>): (() => void) => {
    listeners.push(listener);
    return () => removeArrayItems(listeners, listener);
  };
  func.emit = (payload: T) => {
    listeners.forEach((listener) => listener(payload));
  };
  return func;
}
