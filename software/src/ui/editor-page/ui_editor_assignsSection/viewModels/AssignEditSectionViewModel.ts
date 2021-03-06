import { editorModel } from '~/ui/editor-page/models/EditorModel';
import {
  makePlainOperationEditCardsViewModel,
  makeOperationEditPartViewModel,
} from '~/ui/editor-page/ui_editor_assignsSection/viewModels/OperationEditPartViewModel';
import { makeOperationLayerOptionEditViewModel } from '~/ui/editor-page/ui_editor_assignsSection/viewModels/OperationLayerOptionEditViewModel';
import { makeOperationSlotsPartViewModel } from '~/ui/editor-page/ui_editor_assignsSection/viewModels/OperationSlotsPartViewModel';

export function makeAssignEditSectionViewModel() {
  const isDisabled = !editorModel.isSlotSelected;
  const { isSingleMode, isDualMode } = editorModel;

  const operationSlotsVM = makeOperationSlotsPartViewModel();
  const plainOperationEditCardsVM = makePlainOperationEditCardsViewModel();
  const operationEditPartVM = makeOperationEditPartViewModel();
  const layoutOptionEditVM = makeOperationLayerOptionEditViewModel();

  return {
    isDisabled,
    isSingleMode,
    isDualMode,
    operationSlotsVM,
    plainOperationEditCardsVM,
    operationEditPartVM,
    layoutOptionEditVM,
  };
}
