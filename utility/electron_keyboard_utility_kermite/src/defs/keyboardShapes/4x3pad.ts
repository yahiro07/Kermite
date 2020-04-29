import { IKeyboardShape } from '~defs/ProfileData';

export const keyboardShape_4x3pad: IKeyboardShape = {
  breedName: '4x3pad',
  keyUnits: [
    { id: 'ku1', x: 57, y: 19, r: 0, keyIndex: 3 },
    { id: 'ku2', x: 38, y: 19, r: 0, keyIndex: 2 },
    { id: 'ku3', x: 19, y: 19, r: 0, keyIndex: 1 },
    { id: 'ku4', x: 0, y: 19, r: 0, keyIndex: 0 },

    { id: 'ku7', x: 57, y: 38, r: 0, keyIndex: 7 },
    { id: 'ku8', x: 38, y: 38, r: 0, keyIndex: 6 },
    { id: 'ku9', x: 19, y: 38, r: 0, keyIndex: 5 },
    { id: 'ku10', x: 0, y: 38, r: 0, keyIndex: 4 },

    { id: 'ku13', x: 57, y: 57, r: 0, keyIndex: 11 },
    { id: 'ku14', x: 38, y: 57, r: 0, keyIndex: 10 },
    { id: 'ku15', x: 19, y: 57, r: 0, keyIndex: 9 },
    { id: 'ku16', x: 0, y: 57, r: 0, keyIndex: 8 }
  ],
  bodyPathMarkupText: ['M -20,0', 'L 100,0', 'L 100,80', 'L -20,80', 'z'].join(
    ' '
  )
};