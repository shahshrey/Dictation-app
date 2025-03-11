const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      logger: 'webpack-infrastructure',
    }),
  ],
}; 