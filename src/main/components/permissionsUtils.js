const { systemPreferences, dialog } = require('electron');
const { exec } = require('child_process');

// Check for macOS accessibility permissions
const checkMacOSPermissions = () => {
  if (process.platform === 'darwin') {
    console.log('Checking macOS accessibility permissions');

    // Check for screen recording permission (needed for system-wide overlay)
    const hasScreenRecordingPermission = systemPreferences.getMediaAccessStatus('screen');
    console.log('Screen recording permission status:', hasScreenRecordingPermission);

    if (hasScreenRecordingPermission !== 'granted') {
      console.log('Requesting screen recording permission');
      try {
        // This will prompt the user for permission
        systemPreferences.askForMediaAccess('screen');
      } catch (error) {
        console.error('Error requesting screen recording permission:', error);
      }
    }

    // Check for accessibility permission (needed for system-wide overlay)
    const hasAccessibilityPermission = systemPreferences.isTrustedAccessibilityClient(false);
    console.log('Accessibility permission status:', hasAccessibilityPermission);

    if (!hasAccessibilityPermission) {
      console.log('App needs accessibility permission for system-wide overlay');
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
          }
        })
        .catch(error => {
          console.error('Error showing permission dialog:', error);
        });
    }
  }
};

module.exports = {
  checkMacOSPermissions
}; 