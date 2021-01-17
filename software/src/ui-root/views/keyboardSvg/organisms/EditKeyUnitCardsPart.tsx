import { h } from 'qx';
import { models } from '@ui-root/models';
import { makeKeyUnitCardsPartViewModel } from '@ui-root/viewModels/KeyUnitCard/KeyUnitCardsPartViewModel';
import { EditKeyUnitCard } from '../molecules/EditKeyUnitCard';

export function EditKeyUnitCardsPart() {
  const vm = makeKeyUnitCardsPartViewModel(true, models);
  return (
    <g>
      {vm.cards.map((keyUnit) => (
        <EditKeyUnitCard
          keyUnit={keyUnit}
          key={keyUnit.keyUnitId}
          showLayerDefaultAssign={vm.showLayerDefaultAssign}
          // qxOptimizer="deepEqualExFn"
        />
      ))}
    </g>
  );
}
