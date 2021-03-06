import { IAssignEntryWithLayerFallback, IDisplayKeyEntity } from '~/shared';
import { IPlayerModel, uiStatusModel } from '~/ui/common';
import { getAssignEntryTexts } from '~/ui/common-svg/keyUnitCardModels/KeyUnitCardViewModelCommon';
import { IEditKeyUnitCardViewModel } from '~/ui/common-svg/keyUnitCards/EditKeyUnitCard';
import { EditorModel } from '~/ui/editor-page/models/EditorModel';

export interface IEditKeyUnitCardPartViewModel {
  cards: IEditKeyUnitCardViewModel[];
  showLayerDefaultAssign: boolean;
}

function getAssignForKeyUnit(
  keyUnitId: string,
  playerModel: IPlayerModel,
  editorModel: EditorModel,
): IAssignEntryWithLayerFallback | undefined {
  const dynamic = uiStatusModel.settings.showLayersDynamic;
  return dynamic
    ? playerModel.getDynamicKeyAssign(keyUnitId) || {
        type: 'layerFallbackBlock',
      }
    : editorModel.getAssignForKeyUnitWithLayerFallback(keyUnitId);
}

function makeEditKeyUnitCardViewModel(
  ke: IDisplayKeyEntity,
  playerModel: IPlayerModel,
  editorModel: EditorModel,
): IEditKeyUnitCardViewModel {
  const keyUnitId = ke.keyId;
  const pos = { x: ke.x, y: ke.y, r: ke.angle || 0 };

  const { currentKeyUnitId, setCurrentKeyUnitId } = editorModel;
  const isCurrent = currentKeyUnitId === keyUnitId;
  const setCurrent = () => {
    setCurrentKeyUnitId(keyUnitId);
    uiStatusModel.stopLiveMode();
  };
  const assign = getAssignForKeyUnit(keyUnitId, playerModel, editorModel);
  const { primaryText, secondaryText, isLayerFallback } = getAssignEntryTexts(
    assign,
    editorModel.layers,
  );

  const dynamic = uiStatusModel.settings.showLayersDynamic;
  const isHold = playerModel.keyStates[ke.keyId];

  return {
    keyUnitId,
    pos,
    shape: ke.shape,
    isCurrent,
    setCurrent,
    primaryText,
    secondaryText,
    isLayerFallback: isLayerFallback || false,
    isHold,
    shiftHold: dynamic && playerModel.shiftHold,
  };
}

export function makeEditKeyUnitCardsPartViewModel(
  playerModel: IPlayerModel,
  editorModel: EditorModel,
): IEditKeyUnitCardPartViewModel {
  const { showLayerDefaultAssign } = uiStatusModel.settings;
  return {
    cards: playerModel.displayDesign.keyEntities.map((kp) =>
      makeEditKeyUnitCardViewModel(kp, playerModel, editorModel),
    ),
    showLayerDefaultAssign,
  };
}
