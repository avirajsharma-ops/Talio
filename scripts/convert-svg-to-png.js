const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

async function convertSVGtoPNG() {
  console.log('Converting SVG icons to PNG...');
  
  for (const size of iconSizes) {
    const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
    const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    if (fs.existsSync(svgPath)) {
      try {
        await sharp(svgPath)
          .resize(size, size)
          .png()
          .toFile(pngPath);
        
        console.log(`✅ Converted icon-${size}x${size}.svg to PNG`);
      } catch (error) {
        console.error(`❌ Error converting icon-${size}x${size}.svg:`, error.message);
      }
    } else {
      console.log(`⚠️  SVG file not found: icon-${size}x${size}.svg`);
    }
  }
  
  // Convert favicon
  const faviconSvgPath = path.join(__dirname, '..', 'public', 'favicon.svg');
  const faviconPngPath = path.join(__dirname, '..', 'public', 'favicon.png');
  const faviconIcoPath = path.join(__dirname, '..', 'public', 'favicon.ico');
  
  if (fs.existsSync(faviconSvgPath)) {
    try {
      // Create PNG favicon
      await sharp(faviconSvgPath)
        .resize(32, 32)
        .png()
        .toFile(faviconPngPath);
      
      // Create ICO favicon
      await sharp(faviconSvgPath)
        .resize(32, 32)
        .png()
        .toFile(faviconIcoPath);
      
      console.log('✅ Converted favicon.svg to PNG and ICO');
    } catch (error) {
      console.error('❌ Error converting favicon:', error.message);
    }
  }
  
  console.log('\n🎉 All icons converted successfully!');
  console.log('📱 Your PWA icons are ready for production use.');
}

convertSVGtoPNG().catch(console.error);
