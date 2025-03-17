// Mock the electron module
jest.mock('electron', () => {
  const mockIpc = require('electron-mock-ipc');
  return {
    app: {
      getPath: jest.fn().mockImplementation((name) => {
        if (name === 'userData') return '/mock/userData';
        if (name === 'temp') return '/mock/temp';
        return `/mock/${name}`;
      }),
    },
    ipcMain: mockIpc.ipcMain,
    ipcRenderer: mockIpc.ipcRenderer,
    dialog: {
      showSaveDialog: jest.fn().mockResolvedValue({ canceled: false, filePath: '/mock/save/path.json' }),
    },
    BrowserWindow: jest.fn().mockImplementation(() => ({
      webContents: {
        send: jest.fn(),
      },
    })),
  };
});

// Mock the fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue('{"text":"mock transcription content","id":"mock-id","timestamp":1672531200000,"duration":5,"language":"en"}'),
  createReadStream: jest.fn().mockReturnValue({ path: '/mock/audio.wav' }),
  readdirSync: jest.fn().mockReturnValue(['file1.json', 'file2.json']),
  statSync: jest.fn().mockReturnValue({
    size: 1024,
    birthtime: new Date('2023-01-01'),
    mtime: new Date('2023-01-02'),
  }),
}));

// Mock the path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  basename: jest.fn((path, ext) => {
    const base = path.split('/').pop();
    if (ext && base.endsWith(ext)) {
      return base.slice(0, -ext.length);
    }
    return base;
  }),
}));

// Mock the groq-sdk module
jest.mock('groq-sdk', () => {
  return {
    Groq: jest.fn().mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: jest.fn().mockResolvedValue({ text: 'Mock transcription text' }),
        },
        translations: {
          create: jest.fn().mockResolvedValue({ text: 'Mock translation text' }),
        },
      },
    })),
  };
}); 