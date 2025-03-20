import { ipcMain, dialog, systemPreferences, app, screen } from 'electron';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../../shared/logger';

// Define type for permission cache structure
interface PermissionCache {
  accessibility: boolean;
  permissionDialogShown: number;
  MAX_DIALOG_ATTEMPTS: number;
}

// Constants
const PERMISSION_CACHE_FILE: string = path.join(app.getPath('userData'), 'permission-cache.json');

/**
 * Load permission cache from disk or create default
 * @returns The permission cache object
 */
const loadPermissionCache = (): PermissionCache => {
  try {
    if (fs.existsSync(PERMISSION_CACHE_FILE)) {
      const data = fs.readFileSync(PERMISSION_CACHE_FILE, { encoding: 'utf-8' });
      const cache = JSON.parse(data) as PermissionCache;
      logger.debug('Loaded permission cache from disk:', { cache });
      return cache;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error loading permission cache:', { error: errorMessage });
  }

  // Default cache if file doesn't exist or has an error
  return {
    accessibility: false,
    permissionDialogShown: 0,
    MAX_DIALOG_ATTEMPTS: 2,
  };
};

/**
 * Save permission cache to disk
 * @param cache The permission cache object to save
 */
const savePermissionCache = (cache: PermissionCache): void => {
  try {
    fs.writeFileSync(PERMISSION_CACHE_FILE, JSON.stringify(cache), { encoding: 'utf-8' });
    logger.debug('Saved permission cache to disk:', { cache });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error saving permission cache:', { error: errorMessage });
  }
};

// Cache for permission status to avoid repeated checks
const permissionCache: PermissionCache = loadPermissionCache();

/**
 * Direct check for accessibility permission without using the problematic API
 * @returns Boolean indicating if permission is granted
 */
const checkDirectAccessibilityPermission = (): boolean => {
  // We'll use a simple test to see if we can perform an accessibility operation
  try {
    // Try to get the mouse position, which requires accessibility permission
    screen.getCursorScreenPoint(); // Just call the method without storing the result

    // If we get here without an error, we likely have permission
    logger.debug('Successfully got cursor position, accessibility permission likely granted');
    return true;
  } catch {
    // Ignore the error details, we just care that it failed
    logger.debug('Failed to get cursor position, accessibility permission likely not granted');
    return false;
  }
};

/**
 * Show dialog for accessibility permission
 */
const showAccessibilityPermissionDialog = (): void => {
  // Increment the dialog shown counter
  permissionCache.permissionDialogShown++;
  savePermissionCache(permissionCache);

  logger.debug(
    `Showing permission dialog (attempt ${permissionCache.permissionDialogShown} of ${permissionCache.MAX_DIALOG_ATTEMPTS})`
  );

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
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error showing permission dialog:', { error: errorMessage });
    });
};

/**
 * Recheck accessibility permission after user interaction
 */
const recheckAccessibilityPermission = (): void => {
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
  if (
    !hasAccessibilityPermission &&
    permissionCache.permissionDialogShown < permissionCache.MAX_DIALOG_ATTEMPTS
  ) {
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

/**
 * Check for macOS accessibility permissions
 */
const checkMacOSPermissions = (): void => {
  if (process.platform === 'darwin') {
    logger.debug('Checking macOS accessibility permissions');

    // Check for screen recording permission (needed for system-wide overlay)
    try {
      // Note: Only 'microphone' and 'camera' are valid for getMediaAccessStatus
      // For screen recording we need a different approach
      const hasMicrophonePermission = systemPreferences.getMediaAccessStatus('microphone');
      logger.debug('Microphone permission status:', { status: hasMicrophonePermission });

      if (hasMicrophonePermission !== 'granted') {
        logger.debug('Requesting microphone permission');
        try {
          // This will prompt the user for permission
          systemPreferences.askForMediaAccess('microphone');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Error requesting microphone permission:', { error: errorMessage });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error checking media permissions:', { error: errorMessage });
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
    try {
      // First try to directly check if we have permission without showing a prompt
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error checking accessibility permission:', { error: errorMessage });

      // Fallback to the original method if our direct check fails
      const hasAccessibilityPermission = systemPreferences.isTrustedAccessibilityClient(false);
      logger.debug('Fallback accessibility permission status:', {
        status: hasAccessibilityPermission,
      });

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

/**
 * Reset permission cache (for testing)
 */
const resetPermissionCache = (): void => {
  permissionCache.accessibility = false;
  permissionCache.permissionDialogShown = 0;
  savePermissionCache(permissionCache);
  logger.debug('Permission cache reset');
};

/**
 * Sets up permission-related IPC handlers
 */
const setupPermissionHandlers = (): void => {
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

// Export all functions needed by other modules
export {
  setupPermissionHandlers,
  checkMacOSPermissions,
  recheckAccessibilityPermission,
  resetPermissionCache,
};

// Default export for backward compatibility
export default { setupPermissionHandlers };
