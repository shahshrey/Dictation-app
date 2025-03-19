import { ipcMain, dialog } from 'electron';
import { exec } from 'child_process';
import logger from '../../shared/logger';
import { recheckAccessibilityPermission } from '../components/permissionsUtils';

/**
 * Sets up permission-related IPC handlers
 */
export const setupPermissionHandlers = (): void => {
  // Handle permission issues
  ipcMain.on('permission-issue', (_, permissionType: string) => {
    logger.debug('Permission issue reported:', { permissionType });
    
    if (permissionType === 'accessibility') {
      // Recheck accessibility permissions
      recheckAccessibilityPermission();
    } else if (permissionType === 'microphone') {
      // Show dialog for microphone permission
      dialog
        .showMessageBox({
          type: 'info',
          title: 'Microphone Permission Required',
          message: 'This app needs microphone permission to record audio.',
          detail: 'Please allow microphone access in your system settings.',
          buttons: ['Open System Preferences', 'Later'],
          defaultId: 0,
        })
        .then(({ response }) => {
          if (response === 0) {
            // Open System Preferences to the Microphone pane
            const command =
              'open x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone';
            exec(command);
          }
        })
        .catch(error => {
          logger.error('Error showing microphone permission dialog:', { error: error.message });
        });
    }
  });
};

export default { setupPermissionHandlers }; 