const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icon as base
const generateIconSVG = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 4}" fill="url(#grad)" />
  
  <!-- HRMS Text -->
  <text x="${size/2}" y="${size/2 - size/16}" 
        font-family="Arial, sans-serif" 
        font-size="${size/8}" 
        font-weight="bold" 
        text-anchor="middle" 
        fill="white">HRMS</text>
  
  <!-- Subtitle -->
  <text x="${size/2}" y="${size/2 + size/16}" 
        font-family="Arial, sans-serif" 
        font-size="${size/20}" 
        text-anchor="middle" 
        fill="white" 
        opacity="0.9">System</text>
  
  <!-- Icon elements -->
  <g transform="translate(${size/2 - size/8}, ${size/2 + size/8})">
    <!-- People icon -->
    <circle cx="${size/32}" cy="${size/32}" r="${size/64}" fill="white" opacity="0.8"/>
    <circle cx="${size/16}" cy="${size/32}" r="${size/64}" fill="white" opacity="0.8"/>
    <circle cx="${size*3/32}" cy="${size/32}" r="${size/64}" fill="white" opacity="0.8"/>
    <rect x="0" y="${size/24}" width="${size/16}" height="${size/32}" rx="${size/128}" fill="white" opacity="0.8"/>
    <rect x="${size/24}" y="${size/24}" width="${size/16}" height="${size/32}" rx="${size/128}" fill="white" opacity="0.8"/>
    <rect x="${size/12}" y="${size/24}" width="${size/16}" height="${size/32}" rx="${size/128}" fill="white" opacity="0.8"/>
  </g>
</svg>`;

// Generate icons for each size
iconSizes.forEach(size => {
  const svgContent = generateIconSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`Generated ${filename}`);
});

// Generate favicon
const faviconSVG = generateIconSVG(32);
fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), faviconSVG);
console.log('Generated favicon.svg');

console.log('\n✅ PWA icons generated successfully!');
console.log('\n📝 Next steps:');
console.log('1. Icons are generated as SVG files');
console.log('2. For production, convert to PNG using an online converter');
console.log('3. Replace SVG files with PNG versions');
console.log('4. Test PWA installation');

// Create a simple HTML file to convert SVG to PNG
const converterHTML = `<!DOCTYPE html>
<html>
<head>
    <title>SVG to PNG Converter</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .icon { margin: 10px; display: inline-block; text-align: center; }
        canvas { border: 1px solid #ccc; }
    </style>
</head>
<body>
    <h1>SVG to PNG Converter for PWA Icons</h1>
    <p>Right-click on each canvas and "Save image as" to download PNG files.</p>
    
    <div id="icons"></div>
    
    <script>
        const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
        const iconsDiv = document.getElementById('icons');
        
        sizes.forEach(size => {
            const div = document.createElement('div');
            div.className = 'icon';
            
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = function() {
                ctx.drawImage(img, 0, 0, size, size);
            };
            
            img.src = '/icons/icon-' + size + 'x' + size + '.svg';
            
            const label = document.createElement('p');
            label.textContent = size + 'x' + size;
            
            div.appendChild(canvas);
            div.appendChild(label);
            iconsDiv.appendChild(div);
        });
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, '..', 'public', 'convert-icons.html'), converterHTML);
console.log('Generated convert-icons.html for PNG conversion');
