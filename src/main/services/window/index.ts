import { ipcMain } from 'electron';
import { createMainWindow, minimizeMainWindow, restoreMinimizedWindows } from './mainWindow';
import {
  createPopupWindow,
  showPopupWindow,
  hidePopupWindow,
  hidePopupFromDock,
  setIgnoreMouseEvents,
} from './popupWindow';
import { handleHotkeyToggle, registerGlobalHotkey } from './hotkeyManager';
import { setupDockMenu } from './windowUtilities';
import { MouseEventsOptions } from './types';

/**
 * Sets up window-related IPC handlers
 */
export const setupWindowHandlers = (): void => {
  // Window management
  ipcMain.handle(
    'set-ignore-mouse-events',
    (event, ignore: boolean, options: MouseEventsOptions = { forward: true }) => {
      return setIgnoreMouseEvents(ignore, options);
    }
  );

  // Add handler for minimizing the main window
  ipcMain.handle('minimize-main-window', () => {
    return minimizeMainWindow();
  });

  // Add handler for registering hotkeys
  ipcMain.handle('register-global-hotkey', registerGlobalHotkey);
};

// Export all window-related services
export default {
  createMainWindow,
  createPopupWindow,
  showPopupWindow,
  hidePopupWindow,
  hidePopupFromDock,
  setupDockMenu,
  setIgnoreMouseEvents,
  minimizeMainWindow,
  restoreMinimizedWindows,
  handleHotkeyToggle,
  registerGlobalHotkey,
  setupWindowHandlers,
};

// Re-export types
export * from './types';

// Export individual components
export { createMainWindow, minimizeMainWindow, restoreMinimizedWindows } from './mainWindow';

export {
  createPopupWindow,
  showPopupWindow,
  hidePopupWindow,
  hidePopupFromDock,
  setIgnoreMouseEvents,
} from './popupWindow';

export { handleHotkeyToggle, registerGlobalHotkey } from './hotkeyManager';

export { setupDockMenu } from './windowUtilities';
