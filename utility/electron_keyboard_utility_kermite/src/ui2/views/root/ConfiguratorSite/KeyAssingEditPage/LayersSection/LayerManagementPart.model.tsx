import { ILayer } from '~defs/ProfileData';
import { Arrays } from '~funcs/Arrays';
import { modalTextEdit } from '~ui2/views/common/basicModals';
import { editorModel } from '~ui2/models/zAppDomain';

export class LayerManagementPartViewModel {
  private get layers() {
    return editorModel.layers;
  }

  private get curLayer(): ILayer {
    return this.layers.find((la) => la.layerId === editorModel.currentLayerId)!;
  }

  private get isCurrentLayerCustom() {
    return this.curLayer?.layerId !== 'la0' || false;
  }

  private canShiftCurrentLayerOrder = (dir: -1 | 1): boolean => {
    if (this.isCurrentLayerCustom) {
      const index = this.layers.indexOf(this.curLayer);
      const nextIndex = index + dir;
      return 1 <= nextIndex && nextIndex < this.layers.length;
    } else {
      return false;
    }
  };

  private shiftCurrentLayerOrder(dir: -1 | 1) {
    const { layers } = this;
    const si = layers.indexOf(this.curLayer);
    const di = si + dir;
    [layers[si], layers[di]] = [layers[di], layers[si]];
  }

  get canModifyCurrentLayer() {
    return this.isCurrentLayerCustom;
  }

  get canShiftBackCurrentLayer() {
    return this.canShiftCurrentLayerOrder(-1);
  }

  get canShiftForwardCurrentLayer() {
    return this.canShiftCurrentLayerOrder(1);
  }

  shiftBackCurrentLayer = () => {
    this.shiftCurrentLayerOrder(-1);
  };

  shiftForwardCurrentLayer = () => {
    this.shiftCurrentLayerOrder(1);
  };

  deleteCurrentLayer = () => {
    Arrays.remove(this.layers, this.curLayer);
    editorModel.setCurrentLayerId(this.layers[0].layerId);
  };

  renameCurrentLayer = async () => {
    const newLayerName = await modalTextEdit({
      message: 'layer name:',
      defaultText: this.curLayer.layerName
    });
    if (newLayerName) {
      this.curLayer.layerName = newLayerName;
    }
  };

  addNewLayer = async () => {
    //todo: use sequential layer number
    const layerId = `la${(Math.random() * 1000) >> 0}`;
    const newLayerName = await modalTextEdit({
      message: 'layer name:',
      defaultText: ''
    });
    if (newLayerName) {
      this.layers.push({
        layerId,
        layerName: newLayerName
      });
    }
  };
}