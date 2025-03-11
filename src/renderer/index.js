// DOM Elements
const modelSizeSelect = document.getElementById('model-size');
const shortcutKeySelect = document.getElementById('shortcut-key');
const startAtLoginCheckbox = document.getElementById('start-at-login');
const showNotificationsCheckbox = document.getElementById('show-notifications');
const saveSettingsButton = document.getElementById('save-settings');
const resetSettingsButton = document.getElementById('reset-settings');
const checkPythonButton = document.getElementById('check-python');
const pythonStatusDiv = document.getElementById('python-status');

// Load settings from main process
async function loadSettings() {
  try {
    const settings = await window.api.invoke('settings:get');
    
    // Update UI with settings
    modelSizeSelect.value = settings.modelSize;
    shortcutKeySelect.value = settings.shortcutKey;
    startAtLoginCheckbox.checked = settings.startAtLogin;
    showNotificationsCheckbox.checked = settings.showNotifications;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Save settings to main process
async function saveSettings() {
  try {
    const settings = {
      modelSize: modelSizeSelect.value,
      shortcutKey: shortcutKeySelect.value,
      startAtLogin: startAtLoginCheckbox.checked,
      showNotifications: showNotificationsCheckbox.checked
    };
    
    await window.api.invoke('settings:set', settings);
    showMessage('Settings saved successfully!');
  } catch (error) {
    console.error('Failed to save settings:', error);
    showMessage('Failed to save settings.', true);
  }
}

// Reset settings to defaults
async function resetSettings() {
  try {
    await window.api.invoke('settings:set', { reset: true });
    await loadSettings();
    showMessage('Settings reset to defaults.');
  } catch (error) {
    console.error('Failed to reset settings:', error);
    showMessage('Failed to reset settings.', true);
  }
}

// Check Python environment
async function checkPythonEnvironment() {
  try {
    pythonStatusDiv.innerHTML = '<p>Checking Python environment...</p>';
    pythonStatusDiv.className = 'status-box';
    
    const result = await window.api.invoke('python:validate');
    
    if (result.isValid) {
      pythonStatusDiv.innerHTML = `
        <p>✅ Python environment is valid.</p>
        <p>Python version: ${result.pythonVersion}</p>
        <p>All required packages are installed.</p>
      `;
      pythonStatusDiv.className = 'status-box status-success';
    } else {
      let message = '<p>❌ Python environment is not valid.</p>';
      
      if (!result.pythonInstalled) {
        message += `<p>Python is not installed or not found in PATH.</p>`;
      } else {
        message += `<p>Python version: ${result.pythonVersion}</p>`;
        
        if (result.missingPackages.length > 0) {
          message += `<p>Missing packages: ${result.missingPackages.join(', ')}</p>`;
          message += `<p>Please install the missing packages using pip:</p>`;
          message += `<pre>pip install ${result.missingPackages.join(' ')}</pre>`;
        }
      }
      
      pythonStatusDiv.innerHTML = message;
      pythonStatusDiv.className = 'status-box status-error';
    }
  } catch (error) {
    console.error('Failed to check Python environment:', error);
    pythonStatusDiv.innerHTML = '<p>❌ Failed to check Python environment.</p>';
    pythonStatusDiv.className = 'status-box status-error';
  }
}

// Show a message to the user
function showMessage(message, isError = false) {
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  messageElement.className = isError ? 'message error' : 'message success';
  
  document.body.appendChild(messageElement);
  
  setTimeout(() => {
    messageElement.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    messageElement.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(messageElement);
    }, 300);
  }, 3000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  checkPythonEnvironment();
  
  saveSettingsButton.addEventListener('click', saveSettings);
  resetSettingsButton.addEventListener('click', resetSettings);
  checkPythonButton.addEventListener('click', checkPythonEnvironment);
});

// Listen for messages from main process
window.api.receive('app:error', (error) => {
  showMessage(error, true);
}); 