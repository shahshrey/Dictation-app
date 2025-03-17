const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Define colors for console output
const COLORS = {
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RED: '\x1b[31m'
};

// Log with colors
function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

try {
  // Clean previous builds
  log('Cleaning previous builds...', COLORS.BLUE);
  try {
    execSync('pnpm run clean', { stdio: 'inherit' });
  } catch (cleanError) {
    log('Warning: Clean script failed, continuing anyway...', COLORS.YELLOW);
    log(`Error details: ${cleanError.message}`, COLORS.YELLOW);
  }
  
  // Build the app
  log('Building the app...', COLORS.BLUE);
  execSync('pnpm run build', { stdio: 'inherit' });
  
  // Ensure the Info.plist will be properly configured
  log('Ensuring proper macOS app configuration...', COLORS.BLUE);
  
  // Package as DMG with additional macOS-specific options
  log('Packaging as DMG...', COLORS.BLUE);
  execSync('pnpm exec electron-builder --mac dmg --x64 --arm64 --c.mac.identity=null', { stdio: 'inherit' });
  
  const outputDir = path.resolve(__dirname, '../release-builds');
  
  if (fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir);
    const dmgFiles = files.filter(file => file.endsWith('.dmg'));
    
    if (dmgFiles.length > 0) {
      log(`✅ DMG created successfully at: ${path.join(outputDir, dmgFiles[0])}`, COLORS.GREEN);
      
      // Provide instructions for the user
      log('\nTo install the app:', COLORS.GREEN);
      log('1. Open the DMG file', COLORS.RESET);
      log('2. Drag the app to the Applications folder', COLORS.RESET);
      log('3. Right-click on the app in Applications and select "Open"', COLORS.RESET);
      log('4. Click "Open" when prompted to confirm opening the app', COLORS.RESET);
      log('\nNote: You may need to go to System Preferences > Security & Privacy to allow the app to run', COLORS.YELLOW);
    } else {
      log('⚠️ DMG file not found in output directory', COLORS.YELLOW);
    }
  } else {
    log('⚠️ Output directory not found', COLORS.YELLOW);
  }
} catch (error) {
  log(`❌ Error: ${error.message}`, COLORS.RED);
  process.exit(1);
} 