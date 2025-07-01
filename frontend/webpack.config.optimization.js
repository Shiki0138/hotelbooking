// Webpack optimization configuration for bundle size reduction
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin');
const glob = require('glob');
const path = require('path');

module.exports = {
  mode: 'production',
  
  // Entry point with code splitting
  entry: {
    main: './src/index.js',
    // Vendor bundle for stable libraries
    vendor: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      '@reduxjs/toolkit'
    ]
  },
  
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'static/js/[name].[contenthash:8].js',
    chunkFilename: 'static/js/[name].[contenthash:8].chunk.js',
    clean: true
  },
  
  optimization: {
    minimize: true,
    minimizer: [
      // JavaScript minification
      new TerserPlugin({
        terserOptions: {
          parse: {
            ecma: 8,
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug']
          },
          mangle: {
            safari10: true,
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
          },
        },
        parallel: true,
      }),
      
      // CSS minification
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
            },
          ],
        },
      }),
    ],
    
    // Code splitting strategy
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        
        // Common components
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
        
        // Async chunks for routes
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
        
        // Separate large libraries
        lodash: {
          test: /[\\/]node_modules[\\/]lodash[\\/]/,
          name: 'lodash',
          priority: 20,
        },
        
        // UI library
        mui: {
          test: /[\\/]node_modules[\\/]@mui[\\/]/,
          name: 'mui',
          priority: 20,
        },
      },
    },
    
    // Keep runtime chunk separate
    runtimeChunk: {
      name: 'runtime',
    },
    
    // Module concatenation (scope hoisting)
    concatenateModules: true,
    
    // Tree shaking
    usedExports: true,
    sideEffects: false,
  },
  
  module: {
    rules: [
      // JavaScript/JSX with Babel
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                modules: false, // Enable tree shaking
                targets: {
                  browsers: ['>0.25%', 'not dead']
                }
              }],
              '@babel/preset-react'
            ],
            plugins: [
              // Remove PropTypes in production
              'transform-react-remove-prop-types',
              
              // Optimize lodash imports
              'lodash',
              
              // Dynamic imports for code splitting
              '@babel/plugin-syntax-dynamic-import',
              
              // Class properties
              '@babel/plugin-proposal-class-properties',
              
              // Optional chaining
              '@babel/plugin-proposal-optional-chaining',
            ]
          }
        }
      },
      
      // CSS optimization
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: {
                auto: true,
                localIdentName: '[hash:base64:5]',
              },
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  'postcss-preset-env',
                  'cssnano',
                ],
              },
            },
          },
        ],
      },
    ],
  },
  
  plugins: [
    // Extract CSS into separate files
    new MiniCssExtractPlugin({
      filename: 'static/css/[name].[contenthash:8].css',
      chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
    }),
    
    // Remove unused CSS
    new PurgeCSSPlugin({
      paths: glob.sync(`${path.join(__dirname, 'src')}/**/*`, { nodir: true }),
      safelist: {
        standard: [/^modal/, /^tooltip/, /^popover/], // Keep dynamic classes
      },
    }),
    
    // Gzip compression
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
    }),
    
    // Brotli compression
    new CompressionPlugin({
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
      filename: '[path][base].br',
    }),
    
    // Bundle analyzer (disabled in CI)
    process.env.ANALYZE && new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
    }),
  ].filter(Boolean),
  
  // Performance hints
  performance: {
    maxEntrypointSize: 250000, // 250kb
    maxAssetSize: 200000, // 200kb
    hints: 'warning',
    assetFilter: (assetFilename) => {
      return !assetFilename.endsWith('.map');
    },
  },
};

// Dynamic imports configuration for route-based code splitting
const routeConfig = {
  // Lazy load route components
  routes: {
    Home: () => import(/* webpackChunkName: "home" */ './src/pages/Home'),
    Search: () => import(/* webpackChunkName: "search" */ './src/pages/Search'),
    HotelDetail: () => import(/* webpackChunkName: "hotel-detail" */ './src/pages/HotelDetail'),
    Booking: () => import(/* webpackChunkName: "booking" */ './src/pages/Booking'),
    Account: () => import(/* webpackChunkName: "account" */ './src/pages/Account'),
  },
  
  // Prefetch critical routes
  prefetchRoutes: ['Search', 'HotelDetail'],
  
  // Preload routes based on user behavior
  preloadStrategy: {
    onHover: true,
    onFocus: true,
    afterIdle: true,
  },
};

// Export configurations
module.exports.routeConfig = routeConfig;