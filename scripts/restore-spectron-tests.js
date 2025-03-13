/**
 * This script restores the original Spectron test file from the backup.
 */

const fs = require('fs');
const path = require('path');

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
function main() {
  logger.info('Restoring Spectron tests to original state...');
  
  // Restore the backup
  if (!restoreBackup()) {
    return;
  }
  
  logger.info('');
  logger.info('Spectron tests have been restored to their original state (skipped).');
  logger.info('');
  logger.info('To enable Spectron tests again, run:');
  logger.info('');
  logger.info(`  ${COLORS.CYAN}node scripts/prepare-spectron-tests.js${COLORS.RESET}`);
  logger.info('');
}

// Run the main function
main(); 