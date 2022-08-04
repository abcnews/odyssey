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
  serve: {
    hot: false
  }
};
