// Define logger
export const logger = {
  info: (message: string): void => {
    console.log(`[INFO] ${message}`);
  },
  error: (message: string, error: unknown): void => {
    console.error(`[ERROR] ${message}`, error);
  },
  debug: (message: string): void => {
    console.log(`[DEBUG] ${message}`);
  },
  warn: (message: string): void => {
    console.warn(`[WARN] ${message}`);
  },
  exception: (message: string, error: unknown): void => {
    console.error(`[EXCEPTION] ${message}`, error);
  },
};
