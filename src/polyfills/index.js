module.exports = done => {
  require('ric');

  try {
    // Test ES2015 support
    new Function('(x=``)=>Symbol()');
    done();
  } catch (e) {
    import(/* webpackChunkName: "polyfills" */ './async').then(done);
  }
};
