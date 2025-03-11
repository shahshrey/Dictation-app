const { exec } = require('child_process');
const { PYTHON_PATH } = require('../constants');
const logger = require('../logger');

/**
 * Validates the Python environment for required packages
 * @returns {Promise<Object>} Validation result
 */
async function validatePythonEnvironment() {
  try {
    // Check Python installation
    const pythonVersion = await new Promise((resolve, reject) => {
      exec(`${PYTHON_PATH} --version`, (error, stdout) => {
        if (error) {
          reject(new Error('Python not found'));
          return;
        }
        resolve(stdout.trim());
      });
    });
    
    // Check for required packages
    const requiredPackages = [
      { name: 'whisper', importName: 'whisper' },
      { name: 'torch', importName: 'torch' },
      { name: 'numpy', importName: 'numpy' },
      { name: 'ffmpeg-python', importName: 'ffmpeg' }
    ];
    const missingPackages = [];
    
    for (const pkg of requiredPackages) {
      try {
        await new Promise((resolve, reject) => {
          exec(`${PYTHON_PATH} -c "import ${pkg.importName}"`, (error) => {
            if (error) {
              missingPackages.push(pkg.name);
              logger.error(`Failed to import ${pkg.name}: ${error.message}`);
            }
            resolve();
          });
        });
      } catch (error) {
        logger.exception(error);
      }
    }
    
    return {
      pythonInstalled: true,
      pythonVersion,
      missingPackages,
      isValid: missingPackages.length === 0
    };
  } catch (error) {
    logger.exception(error);
    return {
      pythonInstalled: false,
      pythonVersion: null,
      missingPackages: [],
      isValid: false,
      error: error.message
    };
  }
}

module.exports = { validatePythonEnvironment }; 