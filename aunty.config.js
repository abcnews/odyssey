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
    // Help us identify things we dan try to dedupe imports
    config.plugins.push(new DuplicatePackageCheckerPlugin({ showHelp: false }));

    // Use resolve.alias to dedupe
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'date-fns': path.resolve(__dirname, 'node_modules/date-fns'),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    };

    // Stop `import()`-ed chunks from being split into `[name].js` and `vendors~[name].js`
    config.optimization = {
      ...(config.optimization || {}),
      splitChunks: {
        cacheGroups: {
          defaultVendors: false
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
