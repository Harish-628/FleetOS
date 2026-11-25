import imageCompression from 'browser-image-compression';

export interface CompressedImageResult {
  file: File;
  base64: string;
  sizeKb: number;
  originalSizeKb: number;
}

export async function compressReceiptImage(file: File): Promise<CompressedImageResult> {
  const originalSizeKb = Math.round(file.size / 1024);

  // If already <= 250 KB and a valid format, return with base64
  if (originalSizeKb <= 250 && (file.type === 'image/jpeg' || file.type === 'image/webp')) {
    const base64 = await imageCompression.getDataUrlFromFile(file);
    return {
      file,
      base64,
      sizeKb: originalSizeKb,
      originalSizeKb,
    };
  }

  const options = {
    maxSizeMB: 0.24, // <= 250 KB constraint
    maxWidthOrHeight: 1600, // Preserves crisp diesel invoice typography and pump GST numbers
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    const sizeKb = Math.round(compressedFile.size / 1024);
    const base64 = await imageCompression.getDataUrlFromFile(compressedFile);

    return {
      file: compressedFile,
      base64,
      sizeKb,
      originalSizeKb,
    };
  } catch (error) {
    console.warn('Image compression fallback used:', error);
    const base64 = await imageCompression.getDataUrlFromFile(file);
    return {
      file,
      base64,
      sizeKb: originalSizeKb,
      originalSizeKb,
    };
  }
}
