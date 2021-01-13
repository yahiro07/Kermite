import { createDictionaryFromKeyValues } from '@kermite/shared';
import { ICommonSelectorViewModel } from '@ui-layouter/controls';
import {
  IKeyEntity,
  IEditPropKey,
  editReader,
  editMutations,
} from '@ui-layouter/editor/store';
import {
  IAttributeSlotSource,
  AttributeSlotModel,
  IAttributeSlotViewModel,
} from '@ui-layouter/editor/views/SidePanels/models/slots/AttributeSlotModel';
import { makeSelectorModel } from '@ui-layouter/editor/views/SidePanels/models/slots/SelectorModel';
import { Hook } from 'qx';

const slotSources: IAttributeSlotSource<IKeyEntity, IEditPropKey>[] = [
  {
    propKey: 'keyId',
    label: 'keyID',
    getUnit: () => '',
    validator: (text: string) =>
      text.length < 6 ? undefined : 'must be within 6 characters',
    reader: (value: string) => value,
    writer: (text: string) => text,
  },
  {
    propKey: 'x',
    label: 'x',
    getUnit: () => editReader.coordUnitSuffix,
    validator: (text: string) =>
      text.match(/^-?[0-9.]+$/) ? undefined : 'must be a number',
    reader: (value: number) => value.toString(),
    writer: (text: string) => parseFloat(text),
  },
  {
    propKey: 'y',
    label: 'y',
    getUnit: () => editReader.coordUnitSuffix,
    validator: (text: string) =>
      text.match(/^-?[0-9.]+$/) ? undefined : 'must be a number',
    reader: (value: number) => value.toString(),
    writer: (text: string) => parseFloat(text),
  },
  {
    propKey: 'r',
    label: 'angle',
    getUnit: () => 'deg',
    validator: (text: string) =>
      text.match(/^-?[0-9.]+$/) ? undefined : 'must be a number',
    reader: (value: number) => value.toString(),
    writer: (text: string) => parseFloat(text),
  },
  {
    propKey: 'shape',
    label: 'shape',
    getUnit: () => {
      const shape = editReader.currentKeyEntity?.shape;
      if (shape?.startsWith('std')) {
        return editReader.keySizeUnit === 'KP' ? 'U' : editReader.keySizeUnit;
      }
      return '';
    },
    validator(text: string) {
      const patterns = [
        /^[0-9][0-9.]*$/,
        /^[0-9][0-9.]* [0-9][0-9.]*$/,
        /^circle$/,
        /^isoEnter$/,
      ];
      const valid = patterns.some((p) => text.match(p));
      return valid ? undefined : 'invalid specification';
    },
    reader(value: string) {
      if (value.startsWith('std') || value.startsWith('ext')) {
        return value.split(' ').slice(1).join(' ');
      }
      return '';
    },
    writer(text: string) {
      if (text === 'circle' || text === 'isoEnter') {
        return `ext ${text}`;
      }
      const values = text.split(' ');
      const floatValues = values.map((v) => parseFloat(v)).join(' ');
      return `std ${floatValues}`;
    },
  },
  {
    propKey: 'keyIndex',
    label: 'keyIndex',
    getUnit: () => '',
    validator(text: string) {
      if (text === '') {
        return undefined;
      }
      return text.match(/^[0-9]+$/) ? undefined : 'must be an integer >= 0';
    },
    reader(value: number) {
      if (value === -1) {
        return '';
      }
      return value.toString();
    },
    writer(text: string) {
      if (text === '') {
        return -1;
      }
      return parseInt(text);
    },
  },
];

class KeyEntityAttrsEditorModel {
  private _allSlots: AttributeSlotModel<
    IKeyEntity,
    IEditPropKey
  >[] = slotSources.map(
    (ss) =>
      new AttributeSlotModel(
        ss,
        editMutations.startKeyEdit,
        editMutations.changeKeyProperty,
        editMutations.endKeyEdit,
      ),
  );

  get allSlots() {
    return this._allSlots;
  }

  get errorText() {
    const currentSlot = this._allSlots.find((slot) => slot.hasFocus);
    return currentSlot?.errorText
      ? `${currentSlot.label} ${currentSlot.errorText}`
      : '';
  }

  update() {
    const targetKeyEntity = editReader.currentKeyEntity;
    this._allSlots.forEach((slot) => slot.updateSource(targetKeyEntity));
  }
}

// M
// ----
// VM
interface IPropertyPanelModel {
  keyEntityAttrsVm: {
    slots: IAttributeSlotViewModel[];
    errorText: string;
    vmGroupId: ICommonSelectorViewModel;
  };
}

export function useKeyEntityEditPanelModel(): IPropertyPanelModel {
  const model = Hook.useMemo(() => new KeyEntityAttrsEditorModel(), []);
  model.update();

  const vmGroupId = makeSelectorModel<string>({
    sources: createDictionaryFromKeyValues(
      editReader.allTransGroups.map((group) => [group.groupId, group.groupId]),
    ),
    reader: () => editReader.currentKeyEntity?.groupId || undefined,
    writer: (newChoiceId: string) => {
      if (editReader.currentKeyEntity) {
        editMutations.changeKeyProperty('groupId', newChoiceId);
        editMutations.setCurrentTransGroupByGroupId(newChoiceId);
      }
    },
  });

  return {
    keyEntityAttrsVm: {
      slots: model.allSlots.map((slot) => slot.emitViewModel()),
      errorText: model.errorText,
      vmGroupId,
    },
  };
}
