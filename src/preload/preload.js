contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing API methods ...
  onUpdateRecordingState: (callback) => {
    ipcRenderer.on('update-recording-state', (_, isRecording) => callback(isRecording));
  },
}); 