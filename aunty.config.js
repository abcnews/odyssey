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
    // Enable lazy style injection (https://webpack.js.org/loaders/style-loader/#lazystyletag)
    const lazyStyleTest = /\.lazy\.(css|scss)$/;
    const stylesRule = config.module.rules.find(rule => rule.__hint__ === 'styles');
    const lazyStylesRule = JSON.parse(JSON.stringify(stylesRule));

    stylesRule.exclude = lazyStyleTest;
    lazyStylesRule.test = lazyStyleTest;
    lazyStylesRule.use[0].options = { injectType: 'lazyStyleTag' };
    config.module.rules.splice(config.module.rules.indexOf(stylesRule), 0, lazyStylesRule);

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
