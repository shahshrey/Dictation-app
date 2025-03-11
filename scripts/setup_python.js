#!/usr/bin/env node

/**
 * Python Environment Setup Helper
 * 
 * This script helps users set up the Python environment required for the Whisper Dictation App.
 * It checks for Python installation, required packages, and provides guidance for installation.
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Constants
const PYTHON_PATH = process.platform === 'win32' ? 'python' : 'python3';
const REQUIREMENTS_PATH = path.join(__dirname, '../src/python/requirements.txt');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Execute a command and return the output
 * @param {string} command - Command to execute
 * @returns {Promise<string>} Command output
 */
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * Check if Python is installed
 * @returns {Promise<{installed: boolean, version: string|null}>} Python installation status
 */
async function checkPythonInstallation() {
  try {
    const version = await executeCommand(`${PYTHON_PATH} --version`);
    return { installed: true, version };
  } catch (error) {
    return { installed: false, version: null };
  }
}

/**
 * Check if a Python package is installed
 * @param {string} packageName - Package name to check
 * @returns {Promise<boolean>} Whether the package is installed
 */
async function checkPackageInstallation(packageName) {
  try {
    await executeCommand(`${PYTHON_PATH} -c "import ${packageName}"`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Install Python packages from requirements.txt
 * @returns {Promise<boolean>} Whether installation was successful
 */
async function installPackages() {
  try {
    console.log('Installing required Python packages...');
    await executeCommand(`${PYTHON_PATH} -m pip install -r ${REQUIREMENTS_PATH}`);
    console.log('Packages installed successfully!');
    return true;
  } catch (error) {
    console.error('Failed to install packages:', error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Checking Python environment...');
    
    // Check Python installation
    const pythonStatus = await checkPythonInstallation();
    if (!pythonStatus.installed) {
      console.error('Python is not installed or not found in PATH.');
      console.log('Please install Python 3.7-3.11 from https://www.python.org/downloads/');
      process.exit(1);
    }
    
    console.log(`Python is installed: ${pythonStatus.version}`);
    
    // Check required packages
    const requiredPackages = ['whisper', 'torch', 'numpy', 'ffmpeg'];
    const missingPackages = [];
    
    for (const pkg of requiredPackages) {
      const isInstalled = await checkPackageInstallation(pkg);
      if (!isInstalled) {
        missingPackages.push(pkg);
      }
    }
    
    if (missingPackages.length === 0) {
      console.log('All required packages are installed!');
      process.exit(0);
    }
    
    console.log(`Missing packages: ${missingPackages.join(', ')}`);
    
    // Ask user if they want to install missing packages
    rl.question('Do you want to install the missing packages? (y/n) ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        const success = await installPackages();
        if (success) {
          console.log('Setup completed successfully!');
        } else {
          console.log('Setup failed. Please install the packages manually:');
          console.log(`${PYTHON_PATH} -m pip install -r ${REQUIREMENTS_PATH}`);
        }
      } else {
        console.log('Setup cancelled. Please install the packages manually:');
        console.log(`${PYTHON_PATH} -m pip install -r ${REQUIREMENTS_PATH}`);
      }
      
      rl.close();
    });
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 