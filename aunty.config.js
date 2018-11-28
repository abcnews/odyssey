const getContext = require('@abcaustralia/postcss-config/getContext');
const postcssConfig = require.resolve('@abcaustralia/postcss-config');

module.exports = {
  type: 'react',
  build: {
    useCSSModules: false
  },
  webpack: config => {
    config.entry = {
      index: require.resolve('./src/index.js'),
      'adapter-narrative': require.resolve('./src/adapter-narrative.js')
    };

    const rules = config.module.rules;
    const stylesRule = rules.find(x => x.__hint__ === 'styles');

    stylesRule.include = /(src\/*)/;

    rules.splice(rules.indexOf(stylesRule), 0, {
      test: /\.css$/,
      include: /(node_modules\/@abcaustralia\/*)/,
      use: [
        stylesRule.use[0],
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
              path: postcssConfig,
              ctx: getContext(config.mode === 'development')
            }
          }
        }
      ]
    });

    return config;
  },
  devServer: {
    hot: false
  }
};
