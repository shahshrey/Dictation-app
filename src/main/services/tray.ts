import { ipcMain } from 'electron';
import logger from '../../shared/logger';

// Type assertions for accessing global properties
const getTray = (): unknown => {
  return (global as any).tray;
};

const getUpdateTrayMenu = (): (() => void) | undefined => {
  return (global as any).updateTrayMenu;
};

/**
 * Sets up tray-related IPC handlers
 */
export const setupTrayHandlers = (): void => {
  // Add handler for controlling the tray
  ipcMain.handle('tray-status', () => {
    return { 
      trayExists: !!getTray(),
      updateTrayExists: typeof getUpdateTrayMenu() === 'function'
    };
  });
  
  // Force tray menu update
  ipcMain.handle('update-tray-menu', () => {
    const updateTrayMenu = getUpdateTrayMenu();
    if (updateTrayMenu && typeof updateTrayMenu === 'function') {
      try {
        updateTrayMenu();
        return { success: true };
      } catch (error) {
        logger.error('Error updating tray menu:', { error: (error as Error).message });
        return { success: false, error: String(error) };
      }
    }
    return { success: false, error: 'Update tray menu function not available' };
  });
};

export default { setupTrayHandlers }; 