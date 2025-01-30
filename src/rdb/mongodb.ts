import { MongoClient } from 'mongodb';
import { Collections, ENV } from '../util/constants';

const client = new MongoClient(ENV("MONGODB_URL")!);

export const db = client.db('instagram');

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
