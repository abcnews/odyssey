// External
const { Client } = require('@abcnews/poll-counters-client');

// Ours
const { getMeta } = require('../meta');

const clients = {};

module.exports.track = function(name, value, cb) {
  if (name == null || value == null) {
    throw new Error('Behaviour tracking requires a name and value');
  }

  const { id, isPreview } = getMeta();

  clients[name] = clients[name] || new Client(`odyssey_behaviour__${name}`);

  clients[name].increment({ question: `${id}${isPreview ? '__PREVIEW' : ''}`, answer: value }, (err, question) => {
    if (cb && !err) {
      cb(question);
    }
  });
};
