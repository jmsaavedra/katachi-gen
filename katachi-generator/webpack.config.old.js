const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Custom plugin to inline JS and CSS into HTML
class InlineSourcePlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('InlineSourcePlugin', (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
        'InlineSourcePlugin',
        (data, cb) => {
          // Inline JavaScript
          const jsAssets = compilation.assets;
          Object.keys(jsAssets).forEach(filename => {
            if (filename.endsWith('.js')) {
              const source = jsAssets[filename].source();
              data.html = data.html.replace(
                new RegExp(`<script[^>]*src=['"]\\.\\/${filename}['"][^>]*><\\/script>`, 'g'),
                `<script>${source}</script>`
              );
              // Remove the asset from output
              delete compilation.assets[filename];
            }
          });
          
          // Inline CSS
          Object.keys(jsAssets).forEach(filename => {
            if (filename.endsWith('.css')) {
              const source = jsAssets[filename].source();
              data.html = data.html.replace(
                new RegExp(`<link[^>]*href=['"]\\.\\/${filename}['"][^>]*>`, 'g'),
                `<style>${source}</style>`
              );
              // Remove the asset from output
              delete compilation.assets[filename];
            }
          });
          
          cb(null, data);
        }
      );
    });
  }
}

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
        type: 'asset/inline',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/inline',
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.svg$/,
        use: 'raw-loader',
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'template.html',
      inject: 'head',
      minify: false,
    }),
    new InlineSourcePlugin(),
  ],
  optimization: {
    splitChunks: false, // すべてを1つのファイルにまとめる
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 9000,
    open: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'public': path.resolve(__dirname, 'public'),
    },
  },
};
