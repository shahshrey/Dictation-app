import { IpcMain, dialog, app } from "electron";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Define constants for file storage
const DEFAULT_SAVE_DIR = path.join(os.homedir(), "Documents", "Dictation App");
const DEFAULT_FILENAME = "transcription";

// Ensure save directory exists
if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
  try {
    fs.mkdirSync(DEFAULT_SAVE_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create save directory:", error);
  }
}

export const setupFileStorage = (ipcMain: IpcMain): void => {
  // Save transcription to a file
  ipcMain.handle(
    "save-transcription",
    async (
      _,
      text: string,
      options: { filename?: string; format?: string }
    ) => {
      try {
        const filename = options.filename || DEFAULT_FILENAME;
        const format = options.format || "txt";
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fullFilename = `${filename}_${timestamp}.${format}`;
        const filePath = path.join(DEFAULT_SAVE_DIR, fullFilename);

        fs.writeFileSync(filePath, text, { encoding: "utf-8" });

        return { success: true, filePath };
      } catch (error) {
        console.error("Failed to save transcription:", error);
        return { success: false, error: String(error) };
      }
    }
  );

  // Save transcription with file dialog
  ipcMain.handle("save-transcription-as", async (_, text: string) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const defaultPath = path.join(
        DEFAULT_SAVE_DIR,
        `${DEFAULT_FILENAME}_${timestamp}.txt`
      );

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Save Transcription",
        defaultPath,
        filters: [
          { name: "Text Files", extensions: ["txt"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      fs.writeFileSync(filePath, text, { encoding: "utf-8" });

      return { success: true, filePath };
    } catch (error) {
      console.error("Failed to save transcription:", error);
      return { success: false, error: String(error) };
    }
  });

  // Get recent transcriptions
  ipcMain.handle("get-recent-transcriptions", async () => {
    try {
      if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
        return { success: true, files: [] };
      }

      const files = fs
        .readdirSync(DEFAULT_SAVE_DIR)
        .filter((file) => file.endsWith(".txt"))
        .map((file) => {
          const filePath = path.join(DEFAULT_SAVE_DIR, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
          };
        })
        .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
        .slice(0, 10); // Get only the 10 most recent files

      return { success: true, files };
    } catch (error) {
      console.error("Failed to get recent transcriptions:", error);
      return { success: false, error: String(error) };
    }
  });
};
