const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      background: './src/background/background.ts',
      'content-google': './src/content/google.ts',
      'content-baidu': './src/content/baidu.ts',
      'content-bing': './src/content/bing.ts',
      options: './src/options/options.ts',
      popup: './src/popup/popup.ts'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'js/[name].js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    plugins: [
      new CleanWebpackPlugin(),
      new CopyPlugin({
        patterns: [
          // 复制manifest
          { from: 'manifest.json', to: 'manifest.json' },
          // 复制HTML文件
          { from: 'options.html', to: 'options.html' },
          { from: 'popup.html', to: 'popup.html' },
          // 复制CSS文件
          { from: 'css', to: 'css' },
          // 复制图片资源
          { from: 'images', to: 'images' },
          // 复制SVG图标
          { from: 'hacker-icon.svg', to: 'hacker-icon.svg' },
          // 复制Font Awesome本地化资源
          { 
            from: 'node_modules/@fortawesome/fontawesome-free/css/all.min.css', 
            to: 'libs/font-awesome/css/all.min.css' 
          },
          { 
            from: 'node_modules/@fortawesome/fontawesome-free/webfonts', 
            to: 'libs/font-awesome/webfonts' 
          }
        ]
      })
    ],
    devtool: isProduction ? false : 'inline-source-map',
    optimization: {
      minimize: isProduction
    },
    performance: {
      hints: false
    }
  };
};

