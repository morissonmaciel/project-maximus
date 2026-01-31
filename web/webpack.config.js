const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Environment variables for container support
const WEB_PORT = process.env.WEB_PORT || 8080;

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
    assetModuleFilename: 'assets/[hash][ext][query]' // Organized assets folder
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
      watch: true
    },
    hot: true,
    liveReload: false, // Use HMR only
    compress: true,    // Gzip compression
    port: WEB_PORT,
    host: '0.0.0.0',
    open: false,
    historyApiFallback: {
      index: '/index.html'
    },
    allowedHosts: 'all',
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|webp|ico)$/i,
        type: 'asset/resource' // Handle images and SVGs as files
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource' // Handle fonts
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      inject: 'body' // Inject bundle at end of body
    })
  ],
  resolve: {
    extensions: ['.js']
  }
};
