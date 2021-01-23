import { IPersistKeyboardDesign } from '~/shared';
import { AppError } from '~/shared/defs';
import { fsxReadJsonFile, fsxWriteJsonFile } from '~/shell/funcs';
import { checkLayoutFileContentObjectSchema } from '~/shell/modules/LayoutFileSchemaChecker';
import { ILayoutFileLoader } from '~/shell/services/layout/interfaces';

class LayoutFileLoader implements ILayoutFileLoader {
  async loadLayoutFromFile(filePath: string): Promise<IPersistKeyboardDesign> {
    const obj = await fsxReadJsonFile(filePath);

    const schemaError = checkLayoutFileContentObjectSchema(obj);
    if (schemaError) {
      throw new AppError({
        type: 'InvalidLayoutFileSchema',
        filePath,
        errorDetail: schemaError.toString().replace(/\\\\/g, '\\'),
      });
    }
    return obj as IPersistKeyboardDesign;
  }

  async saveLayoutToFile(
    filePath: string,
    design: IPersistKeyboardDesign,
  ): Promise<void> {
    await fsxWriteJsonFile(filePath, design);
  }
}

export const layoutFileLoader = new LayoutFileLoader();
