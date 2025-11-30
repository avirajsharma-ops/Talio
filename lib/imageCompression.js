import sharp from 'sharp';

/**
 * Compress a base64 image to a smaller, web-optimized WebP format
 * WebP provides 25-35% better compression than JPEG at equivalent quality
 * @param {string} base64Data - Base64 encoded image (with or without data URI prefix)
 * @param {Object} options - Compression options
 * @param {number} options.quality - WebP quality (1-100), default 75
 * @param {number} options.maxWidth - Maximum width in pixels, default 1280
 * @param {number} options.maxHeight - Maximum height in pixels, default 720
 * @param {boolean} options.returnDataUri - Whether to include data:image prefix, default true
 * @returns {Promise<{fullData: string, thumbnail: string}>} Compressed full image and small thumbnail
 */
export async function compressScreenshot(base64Data, options = {}) {
  const {
    quality = 75,
    maxWidth = 1280,
    maxHeight = 720,
    thumbnailWidth = 320,
    thumbnailHeight = 180,
    thumbnailQuality = 60,
    returnDataUri = true
  } = options;

  try {
    // Extract raw base64 data (remove data:image/xxx;base64, prefix if present)
    let rawBase64 = base64Data;
    let mimeType = 'image/webp';
    
    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        rawBase64 = matches[2];
      }
    }

    // Convert base64 to buffer
    const inputBuffer = Buffer.from(rawBase64, 'base64');
    
    // Get original image metadata
    const metadata = await sharp(inputBuffer).metadata();
    const originalSize = inputBuffer.length;

    // Calculate resize dimensions maintaining aspect ratio
    let resizeWidth = metadata.width;
    let resizeHeight = metadata.height;
    
    if (resizeWidth > maxWidth || resizeHeight > maxHeight) {
      const aspectRatio = resizeWidth / resizeHeight;
      if (resizeWidth / maxWidth > resizeHeight / maxHeight) {
        resizeWidth = maxWidth;
        resizeHeight = Math.round(maxWidth / aspectRatio);
      } else {
        resizeHeight = maxHeight;
        resizeWidth = Math.round(maxHeight * aspectRatio);
      }
    }

    // Compress full image - use WebP for best compression (25-35% smaller than JPEG)
    const compressedBuffer = await sharp(inputBuffer)
      .resize(resizeWidth, resizeHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({
        quality,
        effort: 4, // Balance between speed and compression (0-6)
        smartSubsample: true, // Better color subsampling
        nearLossless: false // Use lossy for smaller files
      })
      .toBuffer();

    // Create small thumbnail for quick preview
    const thumbnailBuffer = await sharp(inputBuffer)
      .resize(thumbnailWidth, thumbnailHeight, {
        fit: 'cover',
        position: 'center'
      })
      .webp({
        quality: thumbnailQuality,
        effort: 4
      })
      .toBuffer();

    // Convert back to base64
    const compressedBase64 = compressedBuffer.toString('base64');
    const thumbnailBase64 = thumbnailBuffer.toString('base64');

    // Add data URI prefix if requested (using webp mime type)
    const fullData = returnDataUri 
      ? `data:image/webp;base64,${compressedBase64}`
      : compressedBase64;
    const thumbnail = returnDataUri
      ? `data:image/webp;base64,${thumbnailBase64}`
      : thumbnailBase64;

    const compressionRatio = Math.round((1 - compressedBuffer.length / originalSize) * 100);
    
    console.log(`[Image Compression] ${Math.round(originalSize/1024)}KB → ${Math.round(compressedBuffer.length/1024)}KB WebP (${compressionRatio}% reduction), thumbnail: ${Math.round(thumbnailBuffer.length/1024)}KB`);

    return {
      fullData,
      thumbnail,
      originalSize,
      compressedSize: compressedBuffer.length,
      thumbnailSize: thumbnailBuffer.length,
      compressionRatio,
      dimensions: { width: resizeWidth, height: resizeHeight },
      format: 'webp'
    };
  } catch (error) {
    console.error('[Image Compression] Error:', error.message);
    // Return original data if compression fails
    return {
      fullData: base64Data,
      thumbnail: base64Data,
      originalSize: base64Data.length,
      compressedSize: base64Data.length,
      compressionRatio: 0,
      error: error.message
    };
  }
}

/**
 * Compress multiple screenshots in parallel
 * @param {Array<string>} screenshots - Array of base64 encoded images
 * @param {Object} options - Compression options
 * @returns {Promise<Array<{fullData: string, thumbnail: string}>>}
 */
export async function compressMultipleScreenshots(screenshots, options = {}) {
  const results = await Promise.all(
    screenshots.map(screenshot => compressScreenshot(screenshot, options))
  );
  return results;
}

/**
 * Quick compression for real-time captures - optimized for speed with WebP
 * @param {string} base64Data - Base64 encoded image
 * @returns {Promise<{fullData: string, thumbnail: string}>}
 */
export async function quickCompress(base64Data) {
  return compressScreenshot(base64Data, {
    quality: 65,  // Slightly lower for smaller files
    maxWidth: 1280,
    maxHeight: 720,
    thumbnailWidth: 280,
    thumbnailHeight: 158,
    thumbnailQuality: 50
  });
}

export default { compressScreenshot, compressMultipleScreenshots, quickCompress };
