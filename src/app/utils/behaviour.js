import { Client } from '@abcnews/poll-counters-client';
import { getMeta } from '../meta';

const clients = {};

export const track = (name, value, cb) => {
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
