const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// Create directory if it doesn't exist
const iconDir = path.resolve(__dirname, '../resources/icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Create a simple 16x16 gray icon
function createFallbackIcon() {
  try {
    // Create a new 16x16 PNG
    const png = new PNG({
      width: 16,
      height: 16,
      colorType: 6 // RGBA
    });
    
    // Fill with gray color (RGBA: 149, 165, 166, 255)
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const idx = (png.width * y + x) << 2;
        png.data[idx] = 149;     // R
        png.data[idx + 1] = 165; // G
        png.data[idx + 2] = 166; // B
        png.data[idx + 3] = 255; // A
      }
    }
    
    // Save the fallback icon
    const fallbackPath = path.join(iconDir, 'fallback.png');
    const buffer = PNG.sync.write(png);
    fs.writeFileSync(fallbackPath, buffer);
    console.log(`Fallback icon created at: ${fallbackPath}`);
  } catch (error) {
    console.error('Error creating fallback icon:', error);
  }
}

// Run the fallback icon creation
createFallbackIcon(); 