const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Environment variables for container support
const WEB_PORT = process.env.WEB_PORT || 8080;

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  return {
    mode: 'development',
    entry: './src/index.js',
    devServer: {
      static: [
        {
          directory: path.resolve(__dirname, 'public'),
        }
      ],
      port: WEB_PORT,
      host: '0.0.0.0',
      historyApiFallback: {
        index: '/index.html'
      },
      hot: true,
      open: false,
      allowedHosts: 'all',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.js',
      clean: true,
      publicPath: '/',
    },
    resolve: {
      extensions: ['.js', '.mjs'],
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
        },
        {
          test: /\.svg$/i,
          oneOf: [
            // Rule for @bunnix/components SVGs - treat as resource
            {
              include: path.resolve(__dirname, 'node_modules', '@bunnix', 'components'),
              type: 'asset/resource',
            },
            // App-specific SVGs - import as raw string for Bunnix innerHTML
            {
              issuer: /\.[jt]sx?$/,
              type: 'asset/source',
            },
            // Fallback for any other SVG not explicitly handled
            {
              type: 'asset/resource',
            }
          ],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public/index.html'),
      })
    ]
  };
};
