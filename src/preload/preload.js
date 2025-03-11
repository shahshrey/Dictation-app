const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Send messages to main process
    send: (channel, data) => {
      // Whitelist channels
      const validChannels = [
        'settings:get', 
        'settings:set',
        'python:validate'
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    
    // Receive messages from main process
    receive: (channel, func) => {
      // Whitelist channels
      const validChannels = [
        'settings:result', 
        'python:validation-result',
        'app:error'
      ];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    
    // Invoke methods and get responses
    invoke: async (channel, data) => {
      // Whitelist channels
      const validChannels = [
        'settings:get', 
        'settings:set',
        'python:validate'
      ];
      if (validChannels.includes(channel)) {
        return await ipcRenderer.invoke(channel, data);
      }
      return null;
    }
  }
); 