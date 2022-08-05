module.exports = {
  type: 'basic',
  build: {
    useCSSModules: false
  },
  babel: config => {
    // Compile nanohtml tagged template literals
    config.plugins.push([
      require.resolve('nanohtml'),
      {
        useImport: true
      }
    ]);

    return config;
  },
  webpack: config => {
    // Stop `import()`-ed chunks from being split into `[name].js` and `vendors~[name].js`
    config.optimization = {
      ...(config.optimization || {}),
      splitChunks: {
        cacheGroups: {
          defaultVendors: false
        }
      }
    };

    return config;
  },
  serve: {
    hasBundleAnalysis: true,
    hot: false
  }
};
