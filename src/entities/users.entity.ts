import { ObjectId } from 'mongodb';

export interface UsersEntity {
  _id: ObjectId;
  email: string;
  password: string;
  fullName: string;
  bio?: string;
  username?: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
}
