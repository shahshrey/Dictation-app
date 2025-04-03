module.exports = {
  entry: {
    'popup_window/preload': './src/preload/preload.ts',
    'main_window/preload': './src/preload/preload.ts',
  },
  target: 'electron-preload',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /(node_modules|\.webpack)/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
    fallback: {
      path: require.resolve('path-browserify'),
      fs: false
    }
  },
  externals: {
    electron: 'commonjs electron',
    fs: 'commonjs fs',
    path: 'commonjs path'
  },
  output: {
    filename: '[name].js',
    path: require('path').resolve(__dirname, 'dist'),
  },
  node: {
    __dirname: false,
    __filename: false
  }
}; 