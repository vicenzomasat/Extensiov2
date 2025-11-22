const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background.ts',
    content: './src/content.ts',
    inject: './src/inject/index.ts',
    popup: './src/popup/popup.ts',
    options: './src/options/options.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'popup.html', to: '.' },
        { from: 'options.html', to: '.' },
        { from: 'icons', to: 'icons' },
        { from: 'data', to: 'data' },
        { from: 'LICENSE', to: '.' },
        { from: 'README.md', to: '.' }
      ],
    }),
  ],
  optimization: {
    minimize: false // easier to debug for now
  }
};
