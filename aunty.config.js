module.exports = {
  type: 'basic',
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
