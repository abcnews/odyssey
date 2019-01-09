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

    return config;
  }
};
