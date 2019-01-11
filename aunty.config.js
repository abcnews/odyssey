const path = require('path');
const DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

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
            camelCase: true,
            minimize: true,
            modules: true,
            importLoaders: 1
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

    // Help us analyse our bundle
    if (config.mode === 'development' && process.env.ODYSSEY_DEBUG) {
      config.plugins.push(new BundleAnalyzerPlugin());
    }

    // Help us identify things we dan try to dedupe imports
    config.plugins.push(new DuplicatePackageCheckerPlugin({ showHelp: false }));

    // Use resolve.alias to dedupe
    config.resolve = config.resolve || {};
    config.resolve.alias = Object.assign(config.resolve.alias || {}, {
      'date-fns': path.resolve(__dirname, 'node_modules/date-fns'),
      'performance-now': path.resolve(__dirname, 'node_modules/performance-now'),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    });

    return config;
  }
};
