import { BrowserWindow } from 'electron';

/**
 * Mouse events options for setting ignore mouse events
 */
export interface MouseEventsOptions {
  forward: boolean;
}

/**
 * Window settings interface for managing hotkeys and other window-related settings
 */
export interface WindowSettings {
  hotkey?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Window state interface for tracking window state across the application
 */
export interface WindowState {
  isRecording: boolean;
  mainWindowMinimized: boolean;
  popupWindowMinimized: boolean;
  mainWindowShowRequested: boolean;
  isQuitting: boolean;
}

/**
 * Extended BrowserWindow interface with macOS-specific methods
 */
export interface MacOSBrowserWindow extends BrowserWindow {
  setHiddenInMissionControl: (hidden: boolean) => void;
  setWindowButtonVisibility: (visible: boolean) => void;
  setVisibleOnAllWorkspaces: (
    visible: boolean,
    options?: { visibleOnFullScreen?: boolean; skipTransformProcessType?: boolean }
  ) => void;
  setAccessoryView: (isAccessory: boolean) => void;
}

/**
 * Global declarations to extend the global namespace with our custom properties
 */
declare global {
  // eslint-disable-next-line no-var
  var mainWindow: BrowserWindow | null;
  // eslint-disable-next-line no-var
  var popupWindow: BrowserWindow | null;
  // eslint-disable-next-line no-var
  var mainWindowMinimized: boolean;
  // eslint-disable-next-line no-var
  var popupWindowMinimized: boolean;
  // eslint-disable-next-line no-var
  var mainWindowShowRequested: boolean;
  // eslint-disable-next-line no-var
  var isQuitting: boolean;
  // eslint-disable-next-line no-var
  var isRecording: boolean;
  // eslint-disable-next-line no-var
  var recordingManager: {
    getIsRecording: () => boolean;
  };
}

/**
 * WindowManager interface for the core window management functionality
 */
export interface WindowManager {
  createMainWindow: () => BrowserWindow | null;
  createPopupWindow: () => BrowserWindow | null;
  showPopupWindow: () => void;
  hidePopupWindow: () => void;
  setIgnoreMouseEvents: (ignore: boolean, options?: MouseEventsOptions) => boolean;
  minimizeMainWindow: () => boolean;
  restoreMinimizedWindows: () => void;
}
