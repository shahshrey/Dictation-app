import { app, Menu } from 'electron';
import logger from '../../../shared/logger';
import { showPopupWindow, hidePopupWindow, createPopupWindow } from './popupWindow';

/**
 * Sets up the dock menu (macOS only)
 */
export const setupDockMenu = (): void => {
  if (process.platform === 'darwin') {
    try {
      const dockMenu = Menu.buildFromTemplate([
        {
          label: 'Show/Hide Voice Vibe Popup',
          click: () => {
            if (
              global.popupWindow &&
              typeof global.popupWindow.isDestroyed === 'function' &&
              !global.popupWindow.isDestroyed()
            ) {
              if (global.popupWindow.isVisible()) {
                hidePopupWindow();
              } else {
                showPopupWindow();
              }
            } else {
              createPopupWindow();
              showPopupWindow();
            }
          },
        },
      ]);

      app.dock.setMenu(dockMenu);
    } catch (error) {
      logger.error('Error setting up dock menu:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
};
