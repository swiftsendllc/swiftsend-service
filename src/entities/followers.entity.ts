import { ObjectId } from 'mongodb';

export interface FollowersEntity {
  followingUserId: ObjectId;
  followedUserId: ObjectId;
  createdAt: Date;
}
