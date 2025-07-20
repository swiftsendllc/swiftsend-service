import { MongoClient } from 'mongodb';
import { configService } from '../util/config';
import { Collections } from '../util/constants';

const client = new MongoClient(configService.MONGODB_URL);

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
