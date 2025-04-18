
import { removeBackground, loadImage } from '@huggingface/transformers';

export const processImageBackground = async (imageFile: File): Promise<string | null> => {
  try {
    const image = await loadImage(imageFile);
    const blob = await removeBackground(image);
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Background removal failed:', error);
    return null;
  }
};
