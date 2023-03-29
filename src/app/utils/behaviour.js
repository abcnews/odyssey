import { Client } from '@abcnews/poll-counters-client';
import { getMeta } from '../meta';

const clients = {};

/**
 * track
 * @summary Use our poll-counters Client's increment method to track behaviour.
 * @param {string | undefined} name - The name of the behaviour we're tracking
 * @param {string | undefined} value - The value we should increment
 * @param {Function | undefined} cb - A callback to recieve the behaviour's full data response
 *
 * Note: The poll-counters `increment` Firebase cloud function will gather and
 * return an question's data if we don't provide a truthy `quiet` param.
 * Our Client instance will automatically set a truthy `quiet` param if no
 * callback function is passed to one of its methods.
 * If `track` is called without a callback function, we should try to avoid
 * the (sometimes costly) excess CPU and Download usage on Firebase.
 */
export const track = (name, value, cb) => {
  if (name == null || value == null) {
    throw new Error('Behaviour tracking requires a name and value');
  }

  const { id, isPreview } = getMeta();
  const groupKey = `odyssey_behaviour__${name}`;
  const questionKey = `${id}${isPreview ? '__PREVIEW' : ''}`;
  const answerKey = value;
  const maybeCB = cb ? (err, question) => !err && cb(question) : undefined;

  clients[groupKey] = clients[groupKey] || new Client(groupKey);
  clients[groupKey].increment(
    {
      question: questionKey,
      answer: answerKey
    },
    maybeCB
  );
};
