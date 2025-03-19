import { Tray } from 'electron';

declare module '../components/trayManager' {
  /**
   * Creates the system tray icon and menu
   * @returns Tray instance or null if creation fails
   */
  export function createTray(): Tray | null;

  /**
   * Updates the tray menu based on current application state
   */
  export function updateTrayMenu(): void;

  /**
   * Destroys the tray instance
   */
  export function destroyTray(): void;
}
