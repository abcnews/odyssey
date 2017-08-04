const { getMeta } = require('./src/app/meta');
const { getSections, getMarkers } = require('./src/utils');

module.exports = {
    meta: getMeta(),
    getSections,
    getMarkers
};
