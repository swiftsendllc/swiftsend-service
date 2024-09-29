import { config } from 'dotenv';
config();

import { Collections } from './util/constants';

(async () => {
  const { db } = await import('./rdb/mongodb');
  const users = db.collection(Collections.USERS);
  const userProfiles = db.collection(Collections.USER_PROFILES);
  for await (const user of users.find()) {
    await userProfiles.insertOne({
      userId: user._id,
      fullName: user.fullName,
      username: user.username,
      bio: user.bio || '',
      avatarURL: user.avatarURL || '',
      bannerURL: '',
      websiteURL: '',
      region: '',
      followerCount: user.followerCount || 0,
      followingCount: user.followingCount || 0,
      postCount: user.postCount || 0,
      updatedAt: new Date(),
      createdAt: new Date(),
    });
  }

  console.log('All users migrated');
})();
