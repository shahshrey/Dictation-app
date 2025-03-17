const { systemPreferences, dialog } = require('electron');
const { exec } = require('child_process');
const logger = require('../../shared/logger').default;

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

    // Check for accessibility permission (needed for system-wide overlay)
    const hasAccessibilityPermission = systemPreferences.isTrustedAccessibilityClient(false);
    logger.debug('Accessibility permission status:', { status: hasAccessibilityPermission });

    if (!hasAccessibilityPermission) {
      logger.debug('App needs accessibility permission for system-wide overlay');
      showAccessibilityPermissionDialog();
    }
  }
};

// Show dialog for accessibility permission
const showAccessibilityPermissionDialog = () => {
  dialog
    .showMessageBox({
      type: 'info',
      title: 'Accessibility Permission Required',
      message:
        'This app needs accessibility permission to show the dictation overlay on top of all applications.',
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
  logger.debug('Rechecking accessibility permission');
  const hasAccessibilityPermission = systemPreferences.isTrustedAccessibilityClient(false);
  logger.debug('Updated accessibility permission status:', { status: hasAccessibilityPermission });
  
  // If still not granted, show dialog again after a delay
  if (!hasAccessibilityPermission) {
    setTimeout(() => {
      const hasPermissionNow = systemPreferences.isTrustedAccessibilityClient(false);
      if (!hasPermissionNow) {
        showAccessibilityPermissionDialog();
      } else {
        logger.debug('Accessibility permission granted');
      }
    }, 10000);
  } else {
    logger.debug('Accessibility permission granted');
  }
};

module.exports = {
  checkMacOSPermissions,
  recheckAccessibilityPermission
}; 