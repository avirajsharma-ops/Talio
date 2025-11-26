/**
 * Generate Windows icons from source PNG
 * Creates .ico file for Windows installer
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const SOURCE_ICON = path.join(BUILD_DIR, 'icon-source.png');
const OUTPUT_ICO = path.join(BUILD_DIR, 'icon.ico');

async function generateIcons() {
  // Check if source exists
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error('❌ Source icon not found:', SOURCE_ICON);
    console.log('Please copy the Talio fox icon to', SOURCE_ICON);
    process.exit(1);
  }

  console.log('🎨 Generating Windows icons from:', SOURCE_ICON);

  // Create iconset directory
  const iconsetDir = path.join(BUILD_DIR, 'iconset');
  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true });
  }

  // Icon sizes needed for Windows .ico
  const sizes = [16, 24, 32, 48, 64, 128, 256];

  try {
    // Generate different sizes using sips (macOS) or ImageMagick
    sizes.forEach(size => {
      const outputPath = path.join(iconsetDir, `icon_${size}x${size}.png`);
      try {
        // Try sips first (macOS)
        execSync(`sips -z ${size} ${size} "${SOURCE_ICON}" --out "${outputPath}"`, { stdio: 'pipe' });
      } catch (e) {
        // Fallback to ImageMagick
        try {
          execSync(`convert "${SOURCE_ICON}" -resize ${size}x${size} "${outputPath}"`, { stdio: 'pipe' });
        } catch (e2) {
          console.log(`⚠️ Could not generate ${size}x${size} icon`);
        }
      }
      console.log(`  ✅ Generated ${size}x${size}`);
    });

    // Try png-to-ico first
    try {
      const pngToIco = require('png-to-ico');
      const pngFiles = sizes.map(s => path.join(iconsetDir, `icon_${s}x${s}.png`)).filter(f => fs.existsSync(f));
      const buf = await pngToIco(pngFiles);
      fs.writeFileSync(OUTPUT_ICO, buf);
      console.log('✅ Created icon.ico using png-to-ico');
    } catch (e) {
      // Try ImageMagick as fallback
      try {
        const pngFiles = sizes.map(s => `"${path.join(iconsetDir, `icon_${s}x${s}.png`)}"`).join(' ');
        execSync(`convert ${pngFiles} "${OUTPUT_ICO}"`, { stdio: 'pipe' });
        console.log('✅ Created icon.ico using ImageMagick');
      } catch (e2) {
        console.log('⚠️ Could not create .ico file');
        // Copy largest PNG as fallback
        fs.copyFileSync(path.join(iconsetDir, 'icon_256x256.png'), OUTPUT_ICO.replace('.ico', '.png'));
      }
    }

    console.log('🎉 Icon generation complete!');
    console.log('📁 Output:', BUILD_DIR);

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
  }
}

generateIcons();

