const { MakerSquirrel } = require('@electron-forge/maker-squirrel');
const { MakerZIP } = require('@electron-forge/maker-zip');
const { MakerDeb } = require('@electron-forge/maker-deb');
const { MakerRpm } = require('@electron-forge/maker-rpm');
const { WebpackPlugin } = require('@electron-forge/plugin-webpack');
const path = require('path');

const mainConfig = require('./webpack.main.config');
const rendererConfig = require('./webpack.renderer.config');
const preloadConfig = require('./webpack.preload.config');

module.exports = {
  packagerConfig: {
    asar: true,
    out: 'out',
    dir: 'dist',
    icon: path.resolve(__dirname, 'src/assets/logo/logo'),
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      iconUrl: path.resolve(__dirname, 'src/assets/logo/logo.ico'),
      setupIcon: path.resolve(__dirname, 'src/assets/logo/logo.ico'),
    }), 
    new MakerZIP({}, ['darwin']), 
    new MakerRpm({}), 
    new MakerDeb({})
  ],
  plugins: [
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/renderer/index.html',
            js: './src/renderer/index.tsx',
            name: 'main_window',
            preload: {
              config: preloadConfig,
              js: './src/preload/preload.ts',
            },
          },
          {
            html: './src/renderer/popup.html',
            js: './src/renderer/popup.tsx',
            name: 'popup_window',
            preload: {
              config: preloadConfig,
              js: './src/preload/preload.ts',
            },
          },
        ],
      },
      output: {
        path: 'dist'
      }
    }),
  ],
};
