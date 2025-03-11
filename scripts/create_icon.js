const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

// Create directory if it doesn't exist
const iconDir = path.resolve(__dirname, '../resources/icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Define icon paths
const ICON_PATHS = {
  MAIN: path.join(iconDir, 'icon.png'),
  FALLBACK: path.join(iconDir, 'fallback.png')
};

// Create a simple 32x32 blue icon
async function createIcons() {
  try {
    // Create main icon - blue square
    const mainIcon = await new Jimp(32, 32, 0x3498dbff); // Blue color
    
    // Save the main icon
    await mainIcon.writeAsync(ICON_PATHS.MAIN);
    console.log(`Main icon created at: ${ICON_PATHS.MAIN}`);
    
    // Create fallback icon - gray square
    const fallbackIcon = await new Jimp(16, 16, 0x95a5a6ff); // Gray color
    
    // Save the fallback icon
    await fallbackIcon.writeAsync(ICON_PATHS.FALLBACK);
    console.log(`Fallback icon created at: ${ICON_PATHS.FALLBACK}`);
    
    console.log('Icons created successfully!');
  } catch (error) {
    console.error('Error creating icons:', error);
  }
}

// Run the icon creation
createIcons(); 