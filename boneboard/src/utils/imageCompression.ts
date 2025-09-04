/**
 * Image compression utility for handling logo uploads
 * Compresses images to stay within specified file size limits
 */

export interface CompressionOptions {
  maxSizeBytes: number;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export const compressImage = async (
  file: File,
  options: CompressionOptions
): Promise<string> => {
  const { maxSizeBytes, quality = 0.8, maxWidth = 800, maxHeight = 800 } = options;

  // If file is already under the limit, just return it as base64
  if (file.size <= maxSizeBytes) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);

      // Start with the specified quality and reduce if needed
      let currentQuality = quality;
      let compressedDataUrl: string;

      const tryCompress = () => {
        compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
        
        // Convert base64 to approximate byte size
        const base64Length = compressedDataUrl.split(',')[1].length;
        const approximateBytes = (base64Length * 3) / 4;

        if (approximateBytes <= maxSizeBytes || currentQuality <= 0.1) {
          resolve(compressedDataUrl);
        } else {
          currentQuality -= 0.1;
          tryCompress();
        }
      };

      tryCompress();
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    
    // Create object URL for the image
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
  });
};

export const validateImageFile = (file: File): string | null => {
  if (!file.type.match('image.*')) {
    return 'Please select an image file';
  }
  
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return 'Please select a valid image format (JPEG, PNG, GIF, or WebP)';
  }
  
  return null;
};
