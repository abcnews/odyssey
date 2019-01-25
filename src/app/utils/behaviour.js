// External
import { Client } from '@abcnews/poll-counters-client';

// Ours
import { IS_PREVIEW } from '../../constants';
import { getMeta } from '../meta';

const clients = {};

export const track = function(name, value, cb) {
  if (name == null || value == null) {
    throw new Error('Behaviour tracking requires a name and value');
  }

  clients[name] = clients[name] || new Client(`odyssey_behaviour__${name}`);

  clients[name].increment(
    { question: `${getMeta().id}${IS_PREVIEW ? '__PREVIEW' : ''}`, answer: value },
    (err, question) => {
      if (cb && !err) {
        cb(question);
      }
    }
  );
};
