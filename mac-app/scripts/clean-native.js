const fs = require('fs');
const path = require('path');

// Clean up build-tmp directories that cause universal build issues
function cleanBuildTmp(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (item.startsWith('build-tmp') || item === 'build') {
        console.log(`Removing: ${fullPath}`);
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        cleanBuildTmp(fullPath);
      }
    }
  }
}

const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('Cleaning native module build artifacts...');
  cleanBuildTmp(nodeModulesPath);
  console.log('Done cleaning.');
}
