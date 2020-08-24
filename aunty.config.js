const path = require('path');
const DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin');

module.exports = {
  type: 'react',
  build: {
    useCSSModules: false
  },
  serve: {
    hot: false
  },
  webpack: config => {
    const rules = config.module.rules;
    const stylesRule = rules.find(x => x.__hint__ === 'styles');

    // Limit the styles rule to the `src` directory
    stylesRule.include = /(src\/*)/;

    // Add a rule for @abcaustralia CSS
    rules.splice(rules.indexOf(stylesRule), 0, {
      test: /\.css$/,
      include: /(node_modules\/@abcaustralia\/*)/,
      use: [
        stylesRule.use[0], // style-loader
        {
          loader: require.resolve('css-loader'),
          options: {
            importLoaders: 1,
            modules: {
              exportLocalsConvention: 'camelCase'
            }
          }
        },
        {
          loader: require.resolve('postcss-loader'),
          options: {
            config: {
              path: require.resolve('@abcaustralia/postcss-config'),
              ctx: require('@abcaustralia/postcss-config/getContext')(config.mode === 'development')
            }
          }
        }
      ]
    });

    // Help us identify things we dan try to dedupe imports
    config.plugins.push(new DuplicatePackageCheckerPlugin({ showHelp: false }));

    // Use resolve.alias to dedupe
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'date-fns': path.resolve(__dirname, 'node_modules/date-fns'),
      'performance-now': path.resolve(__dirname, 'node_modules/performance-now'),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    };

    // Stop `import()`-ed chunks from being split into `[name].js` and `vendors~[name].js`
    config.optimization = {
      ...(config.optimization || {}),
      splitChunks: {
        cacheGroups: {
          vendors: false
        }
      }
    };

    // Allow larger entrypoint & assets sizes than the default (250000)
    config.performance = {
      ...(config.performance || {}),
      maxAssetSize: 500000,
      maxEntrypointSize: 500000
    };

    return config;
  }
};
