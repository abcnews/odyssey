module.exports = {
  type: 'basic-app',
  build: {
    useCSSModules: false
  },
  webpack: {
    entry: {
      index: require.resolve('./src/index.js'),
      'adapter-narrative': require.resolve('./src/adapter-narrative.js')
    }
  },
  devServer: {
    hot: false
  }
};
