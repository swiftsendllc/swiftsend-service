import { ObjectId } from 'mongodb';

export interface UserProfilesEntity {
  userId: ObjectId;
  fullName: string;
  username: string;
  bio: string;

  gender: string;

  region: string;

  pronouns: string;

  avatarURL: string;
  bannerURL: string;
  websiteURL: string;

  postCount: number;
  followerCount: number;
  followingCount: number;
  stripeCustomerId:string | null

  createdAt: Date;
  updatedAt: Date;
  lastSeen: Date;
}
