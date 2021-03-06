import { jsx } from 'qx';
import { texts } from '~/ui/common';
import { SectionHeaderText } from '~/ui/editor-page/components/elements/SectionHeaderText';
import { makeLayerListBoxPartViewModel } from '~/ui/editor-page/ui_editor_layerManagement/viewModels/LayersListBoxPartViewModel';
import { makeLayerManagementPartViewModel } from '~/ui/editor-page/ui_editor_layerManagement/viewModels/LayersManagementPartViewModel';
import { LayerManagementPart } from './views/LayerManagementPart';
import { LayersListBoxPart } from './views/LayersListBoxPart';

export function LayersSection() {
  const layerListBoxPartViewModel = makeLayerListBoxPartViewModel();
  const layerManagementPartViewModel = makeLayerManagementPartViewModel();

  return (
    <div>
      <SectionHeaderText
        text={texts.label_assigner_layerListHeader}
        icon="layers"
        hint={texts.hint_assigner_layers_layerListHeader}
      />
      <LayersListBoxPart vm={layerListBoxPartViewModel} />
      <LayerManagementPart vm={layerManagementPartViewModel} />
    </div>
  );
}
