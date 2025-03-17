/**
 * This script prepares the Spectron tests by removing the .skip from the test suite.
 * It also creates a backup of the original file in case you want to revert the changes.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Define file paths
const TEST_FILE_PATH = path.join(__dirname, '../tests/integration/ipc-communication.test.ts');
const BACKUP_FILE_PATH = path.join(__dirname, '../tests/integration/ipc-communication.test.ts.bak');

// ANSI color codes for console output
const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
};

// Logger with colors
const logger = {
  info: (message) => console.log(`${COLORS.BLUE}[INFO]${COLORS.RESET} ${message}`),
  success: (message) => console.log(`${COLORS.GREEN}[SUCCESS]${COLORS.RESET} ${message}`),
  warning: (message) => console.log(`${COLORS.YELLOW}[WARNING]${COLORS.RESET} ${message}`),
  error: (message) => console.log(`${COLORS.RED}[ERROR]${COLORS.RESET} ${message}`),
};

// Function to check if the application is built
async function checkApplicationBuilt() {
  try {
    const appDirExists = fs.existsSync(path.join(__dirname, '../out'));
    if (!appDirExists) {
      logger.warning('The application does not appear to be built yet.');
      logger.warning('Spectron tests require the application to be built first.');
      
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question(`${COLORS.YELLOW}Do you want to build the application now? (y/n)${COLORS.RESET} `, resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        logger.debug('Building the application...');
        const { execSync } = require('child_process');
        execSync('pnpm build', { stdio: 'inherit' });
        logger.success('Application built successfully!');
      } else {
        logger.warning('Skipping build. Note that Spectron tests may fail without a built application.');
      }
    } else {
      logger.debug('Application appears to be built.');
    }
  } catch (error) {
    logger.error(`Error checking if application is built: ${error.message}`);
  }
}

// Function to create a backup of the test file
function createBackup() {
  try {
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.copyFileSync(TEST_FILE_PATH, BACKUP_FILE_PATH);
      logger.success(`Backup created at ${BACKUP_FILE_PATH}`);
      return true;
    } else {
      logger.error(`Test file not found at ${TEST_FILE_PATH}`);
      return false;
    }
  } catch (error) {
    logger.error(`Error creating backup: ${error.message}`);
    return false;
  }
}

// Function to enable Spectron tests
function enableSpectronTests() {
  try {
    if (!fs.existsSync(TEST_FILE_PATH)) {
      logger.error(`Test file not found at ${TEST_FILE_PATH}`);
      return false;
    }
    
    let content = fs.readFileSync(TEST_FILE_PATH, 'utf-8');
    
    // Check if tests are already enabled
    if (!content.includes('describe.skip(\'Real IPC Communication with Spectron')) {
      logger.debug('Spectron tests are already enabled.');
      return true;
    }
    
    // Replace describe.skip with describe
    content = content.replace(
      'describe.skip(\'Real IPC Communication with Spectron',
      'describe(\'Real IPC Communication with Spectron'
    );
    
    fs.writeFileSync(TEST_FILE_PATH, content, 'utf-8');
    logger.success('Spectron tests enabled successfully!');
    return true;
  } catch (error) {
    logger.error(`Error enabling Spectron tests: ${error.message}`);
    return false;
  }
}

// Function to restore the backup
function restoreBackup() {
  try {
    if (fs.existsSync(BACKUP_FILE_PATH)) {
      fs.copyFileSync(BACKUP_FILE_PATH, TEST_FILE_PATH);
      logger.success(`Original file restored from backup.`);
      return true;
    } else {
      logger.error(`Backup file not found at ${BACKUP_FILE_PATH}`);
      return false;
    }
  } catch (error) {
    logger.error(`Error restoring backup: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  logger.debug('Preparing Spectron tests...');
  
  // Check if application is built
  await checkApplicationBuilt();
  
  // Create a backup of the test file
  if (!createBackup()) {
    return;
  }
  
  // Enable Spectron tests
  if (!enableSpectronTests()) {
    return;
  }
  
  logger.debug('');
  logger.debug('Spectron tests are now ready to run!');
  logger.debug('You can run them with:');
  logger.debug('');
  logger.debug(`  ${COLORS.CYAN}pnpm test:integration:spectron${COLORS.RESET}`);
  logger.debug('');
  logger.debug('To restore the original file (with tests skipped), run:');
  logger.debug('');
  logger.debug(`  ${COLORS.CYAN}node scripts/restore-spectron-tests.js${COLORS.RESET}`);
  logger.debug('');
  logger.warning('Note: Spectron tests require the application to be built and may require additional setup.');
}

// Run the main function
main().catch(error => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 