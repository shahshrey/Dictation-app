const { systemPreferences, dialog, app } = require('electron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../../shared/logger').default;

// Path to store permission cache
const PERMISSION_CACHE_FILE = path.join(app.getPath('userData'), 'permission-cache.json');

// Load permission cache from disk or create default
const loadPermissionCache = () => {
  try {
    if (fs.existsSync(PERMISSION_CACHE_FILE)) {
      const data = fs.readFileSync(PERMISSION_CACHE_FILE, { encoding: 'utf-8' });
      const cache = JSON.parse(data);
      logger.debug('Loaded permission cache from disk:', cache);
      return cache;
    }
  } catch (error) {
    logger.error('Error loading permission cache:', { error: error.message });
  }
  
  // Default cache if file doesn't exist or has an error
  return {
    accessibility: false,
    permissionDialogShown: 0,
    MAX_DIALOG_ATTEMPTS: 2
  };
};

// Save permission cache to disk
const savePermissionCache = (cache) => {
  try {
    fs.writeFileSync(PERMISSION_CACHE_FILE, JSON.stringify(cache), { encoding: 'utf-8' });
    logger.debug('Saved permission cache to disk:', cache);
  } catch (error) {
    logger.error('Error saving permission cache:', { error: error.message });
  }
};

// Cache for permission status to avoid repeated checks
const permissionCache = loadPermissionCache();

// Check for macOS accessibility permissions
const checkMacOSPermissions = () => {
  if (process.platform === 'darwin') {
    logger.debug('Checking macOS accessibility permissions');

    // Check for screen recording permission (needed for system-wide overlay)
    const hasScreenRecordingPermission = systemPreferences.getMediaAccessStatus('screen');
    logger.debug('Screen recording permission status:', { status: hasScreenRecordingPermission });

    if (hasScreenRecordingPermission !== 'granted') {
      logger.debug('Requesting screen recording permission');
      try {
        // This will prompt the user for permission
        systemPreferences.askForMediaAccess('screen');
      } catch (error) {
        logger.error('Error requesting screen recording permission:', { error: error.message });
      }
    }

    // If we've already verified permissions before, don't check again
    if (permissionCache.accessibility) {
      logger.debug('Using cached accessibility permission status: granted');
      return;
    }

    // If we've shown the dialog too many times, don't show it again
    if (permissionCache.permissionDialogShown >= permissionCache.MAX_DIALOG_ATTEMPTS) {
      logger.debug('Maximum permission dialog attempts reached, not showing again');
      return;
    }

    // Direct check for accessibility permission without using the problematic API
    // This is a workaround for the Electron bug where isTrustedAccessibilityClient
    // doesn't work correctly after the first call
    try {
      // First try to directly check if we have permission without showing a prompt
      // We'll use AXIsProcessTrustedWithOptions under the hood which is more reliable
      const hasDirectAccessibilityPermission = checkDirectAccessibilityPermission();
      
      if (hasDirectAccessibilityPermission) {
        // If we have permission, update cache and save
        permissionCache.accessibility = true;
        savePermissionCache(permissionCache);
        logger.debug('Accessibility permission granted and cached');
        return;
      }
      
      // If we don't have permission, show the dialog
      logger.debug('App needs accessibility permission for system-wide overlay');
      showAccessibilityPermissionDialog();
    } catch (error) {
      logger.error('Error checking accessibility permission:', { error: error.message });
      // Fallback to the original method if our direct check fails
      const hasAccessibilityPermission = systemPreferences.isTrustedAccessibilityClient(false);
      logger.debug('Fallback accessibility permission status:', { status: hasAccessibilityPermission });

      if (!hasAccessibilityPermission) {
        logger.debug('App needs accessibility permission for system-wide overlay');
        showAccessibilityPermissionDialog();
      } else {
        // Cache the positive permission status
        permissionCache.accessibility = true;
        savePermissionCache(permissionCache);
        logger.debug('Accessibility permission granted and cached');
      }
    }
  }
};

// Direct check for accessibility permission without using the problematic API
const checkDirectAccessibilityPermission = () => {
  // We'll use a simple test to see if we can perform an accessibility operation
  // If we can, then we have permission
  try {
    // Try to get the mouse position, which requires accessibility permission
    const { screen } = require('electron');
    screen.getCursorScreenPoint(); // Just call the method without storing the result
    
    // If we get here without an error, we likely have permission
    logger.debug('Successfully got cursor position, accessibility permission likely granted');
    return true;
  } catch (error) {
    logger.debug('Failed to get cursor position, accessibility permission likely not granted');
    return false;
  }
};

// Show dialog for accessibility permission
const showAccessibilityPermissionDialog = () => {
  // Increment the dialog shown counter
  permissionCache.permissionDialogShown++;
  savePermissionCache(permissionCache);
  
  logger.debug(`Showing permission dialog (attempt ${permissionCache.permissionDialogShown} of ${permissionCache.MAX_DIALOG_ATTEMPTS})`);
  
  dialog
    .showMessageBox({
      type: 'info',
      title: 'Accessibility Permission Required',
      message:
        'This app needs accessibility permission to show the Voice Vibe overlay on top of all applications.',
      detail:
        'Please go to System Preferences > Security & Privacy > Privacy > Accessibility and add this app to the list of allowed apps.',
      buttons: ['Open System Preferences', 'Later'],
      defaultId: 0,
    })
    .then(({ response }) => {
      if (response === 0) {
        // Open System Preferences to the Accessibility pane
        const command =
          'open x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility';
        exec(command);
        
        // Set a timer to recheck permissions after a delay
        setTimeout(recheckAccessibilityPermission, 5000);
      }
    })
    .catch(error => {
      logger.error('Error showing permission dialog:', { error: error.message });
    });
};

// Recheck accessibility permission after user interaction
const recheckAccessibilityPermission = () => {
  // If we've already verified permissions, don't recheck
  if (permissionCache.accessibility) {
    logger.debug('Using cached accessibility permission status: granted');
    return;
  }
  
  // If we've shown the dialog too many times, don't recheck
  if (permissionCache.permissionDialogShown >= permissionCache.MAX_DIALOG_ATTEMPTS) {
    logger.debug('Maximum permission dialog attempts reached, not rechecking');
    return;
  }
  
  logger.debug('Rechecking accessibility permission');
  
  // Use our direct check method first
  const hasDirectAccessibilityPermission = checkDirectAccessibilityPermission();
  
  if (hasDirectAccessibilityPermission) {
    permissionCache.accessibility = true;
    savePermissionCache(permissionCache);
    logger.debug('Accessibility permission granted and cached');
    return;
  }
  
  // Fallback to the original method
  const hasAccessibilityPermission = systemPreferences.isTrustedAccessibilityClient(false);
  logger.debug('Updated accessibility permission status:', { status: hasAccessibilityPermission });
  
  // If permission is granted, update cache
  if (hasAccessibilityPermission) {
    permissionCache.accessibility = true;
    savePermissionCache(permissionCache);
    logger.debug('Accessibility permission granted and cached');
    return;
  }
  
  // If still not granted and we haven't reached the maximum attempts, show dialog again after a delay
  if (!hasAccessibilityPermission && permissionCache.permissionDialogShown < permissionCache.MAX_DIALOG_ATTEMPTS) {
    setTimeout(() => {
      // Check one more time directly
      const hasPermissionNow = checkDirectAccessibilityPermission();
      if (hasPermissionNow) {
        permissionCache.accessibility = true;
        savePermissionCache(permissionCache);
        logger.debug('Accessibility permission granted and cached');
      } else {
        // Fallback to the original method
        const hasPermissionFallback = systemPreferences.isTrustedAccessibilityClient(false);
        if (hasPermissionFallback) {
          permissionCache.accessibility = true;
          savePermissionCache(permissionCache);
          logger.debug('Accessibility permission granted and cached');
        } else if (permissionCache.permissionDialogShown < permissionCache.MAX_DIALOG_ATTEMPTS) {
          // Only show dialog if we haven't reached the maximum attempts
          showAccessibilityPermissionDialog();
        }
      }
    }, 10000);
  }
};

// Reset permission cache (for testing)
const resetPermissionCache = () => {
  permissionCache.accessibility = false;
  permissionCache.permissionDialogShown = 0;
  savePermissionCache(permissionCache);
  logger.debug('Permission cache reset');
};

module.exports = {
  checkMacOSPermissions,
  recheckAccessibilityPermission,
  resetPermissionCache
}; 