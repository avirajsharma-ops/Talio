// Script to remove unused locale files from Electron to reduce build size
const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  // For macOS, locales are inside the app bundle
  const resourcesDir = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources');
  
  if (fs.existsSync(resourcesDir)) {
    const items = fs.readdirSync(resourcesDir);
    
    // Remove all .lproj folders except English
    const keepLproj = ['en.lproj', 'en-US.lproj', 'Base.lproj'];
    
    for (const item of items) {
      if (item.endsWith('.lproj') && !keepLproj.includes(item)) {
        const itemPath = path.join(resourcesDir, item);
        fs.rmSync(itemPath, { recursive: true, force: true });
        console.log(`Removed locale: ${item}`);
      }
    }
    
    console.log(`Mac locale cleanup complete.`);
  }
  
  // Also clean up Electron's locales folder
  const electronLocalesDir = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Frameworks', 'Electron Framework.framework', 'Versions', 'A', 'Resources');
  
  if (fs.existsSync(electronLocalesDir)) {
    const items = fs.readdirSync(electronLocalesDir);
    const keepLproj = ['en.lproj', 'en-US.lproj', 'Base.lproj'];
    
    for (const item of items) {
      if (item.endsWith('.lproj') && !keepLproj.includes(item)) {
        const itemPath = path.join(electronLocalesDir, item);
        fs.rmSync(itemPath, { recursive: true, force: true });
        console.log(`Removed Electron locale: ${item}`);
      }
    }
  }
};

