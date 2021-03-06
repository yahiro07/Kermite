import { jsx } from 'qx';
import { makeNavigationViewModel } from '~/ui/root/views/navigation/NavigationButtonsArea.model';
import { NavigationButton } from './elements/NavigationButton';

export const NavigationButtonsArea = () => {
  const vm = makeNavigationViewModel();
  return (
    <div xs="width[100%]">
      {vm.entries.map((entry) => (
        <NavigationButton vm={entry} key={entry.pagePath} />
      ))}
    </div>
  );
};
