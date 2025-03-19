import { ipcMain } from 'electron';
import { setIgnoreMouseEvents, minimizeMainWindow } from '../components/windowManager';

interface MouseEventsOptions {
  forward: boolean;
}

/**
 * Sets up window-related IPC handlers
 */
export const setupWindowHandlers = (): void => {
  // Window management
  ipcMain.handle('set-ignore-mouse-events', (event, ignore: boolean, options: MouseEventsOptions = { forward: true }) => {
    return setIgnoreMouseEvents(ignore, options);
  });

  // Add handler for minimizing the main window
  ipcMain.handle('minimize-main-window', () => {
    return minimizeMainWindow();
  });
};

export default { setupWindowHandlers }; 