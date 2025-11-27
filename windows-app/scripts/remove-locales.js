// Script to remove unused locale files from Electron to reduce build size
const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  const localeDir = path.join(context.appOutDir, 'locales');
  
  if (fs.existsSync(localeDir)) {
    const files = fs.readdirSync(localeDir);
    
    // Keep only English locale
    const keepLocales = ['en-US.pak', 'en-GB.pak'];
    
    for (const file of files) {
      if (!keepLocales.includes(file)) {
        const filePath = path.join(localeDir, file);
        fs.unlinkSync(filePath);
        console.log(`Removed locale: ${file}`);
      }
    }
    
    console.log(`Locale cleanup complete. Kept: ${keepLocales.join(', ')}`);
  }
};

