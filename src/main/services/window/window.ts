import { setupWindowHandlers } from './index';

/**
 * Sets up window-related IPC handlers
 */
export const setupHandlers = (): void => {
  setupWindowHandlers();
};

// Re-export everything from the window directory
export * from './window';

// Explicitly export the setupWindowHandlers function
export { setupWindowHandlers };

export default { setupHandlers };
