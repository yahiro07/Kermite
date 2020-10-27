import { css } from 'goober';
import { h } from '~lib/qx';
import { uiTheme } from '~ui/core';
import { uiStatusModel } from '~ui/models';
import { PageSignature } from '~ui/models/UiStatusModel';
import { CustomWindowFrame } from './layout/CustomWindowFrame';
import { GlobalMenuPart } from './navigation/GlobalMenu';
import { NavigationButtonsArea } from './navigation/NavigationButtonsArea';
import { FirmwareUpdationPage } from './pages/FirmwareUpdationPage';
import { EditorPage } from './pages/KeyAssignEditPage/EditorPage';
import { KeyboardShapePreviewPage } from './pages/ShapePreviewPage/ShapePreviewPage';

function getPageComponent(pageSig: PageSignature): () => JSX.Element {
  const pageComponentMap: {
    [key in PageSignature]: () => JSX.Element;
  } = {
    editor: EditorPage,
    shapePreview: KeyboardShapePreviewPage,
    firmwareUpdation: FirmwareUpdationPage
  };
  return pageComponentMap[pageSig];
}

export const ConfiguratorZoneRoot = () => {
  const PageComponent = getPageComponent(uiStatusModel.settings.page);

  const cssContentRow = css`
    background: ${uiTheme.colors.clBackground};
    color: ${uiTheme.colors.clMainText};
    display: flex;
  `;

  const cssNavigationColumn = css`
    width: 50px;
    flex-shrink: 0;
    background: ${uiTheme.colors.clNavigationColumn};
    padding: 10px;
  `;

  const cssMainColumn = css`
    flex-grow: 1;
  `;

  return (
    <CustomWindowFrame>
      <div css={cssContentRow}>
        <div css={cssNavigationColumn}>
          <GlobalMenuPart />
          <NavigationButtonsArea />
        </div>
        <div css={cssMainColumn}>
          <PageComponent />
        </div>
      </div>
    </CustomWindowFrame>
  );
};