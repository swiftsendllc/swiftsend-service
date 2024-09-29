import { MongoClient } from 'mongodb';
import { Collections } from '../util/constants';

const client = new MongoClient(process.env.MONGODB_URL!);

export const db = client.db('practiceClone');

(async () => {
  db.collection(Collections.USERS).createIndex(
    {
      email: 1,
    },
    { unique: true },
  );

  db.collection(Collections.USER_PROFILES).createIndex(
    {
      userId: 1,
    },
    { unique: true },
  );
})();
