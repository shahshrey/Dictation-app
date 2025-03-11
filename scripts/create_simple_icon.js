const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// Create directory if it doesn't exist
const iconDir = path.resolve(__dirname, '../resources/icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Create a simple 32x32 blue icon
function createIcon() {
  try {
    // Create a new 32x32 PNG
    const png = new PNG({
      width: 32,
      height: 32,
      colorType: 6 // RGBA
    });
    
    // Fill with blue color (RGBA: 52, 152, 219, 255)
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const idx = (png.width * y + x) << 2;
        png.data[idx] = 52;     // R
        png.data[idx + 1] = 152; // G
        png.data[idx + 2] = 219; // B
        png.data[idx + 3] = 255; // A
      }
    }
    
    // Save the icon
    const iconPath = path.join(iconDir, 'icon.png');
    const buffer = PNG.sync.write(png);
    fs.writeFileSync(iconPath, buffer);
    console.log(`Icon created at: ${iconPath}`);
  } catch (error) {
    console.error('Error creating icon:', error);
  }
}

// Run the icon creation
createIcon(); 