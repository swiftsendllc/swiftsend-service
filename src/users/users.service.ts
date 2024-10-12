import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { FollowersEntity } from '../entities/followers.entity';
import { UserProfilesEntity } from '../entities/user-profiles.entity';
import { UsersEntity } from '../entities/users.entity';
import { db } from '../rdb/mongodb';
import { Collections } from '../util/constants';
import { UpdateUserInput } from './dto/update-user.dto';

const users = db.collection<UsersEntity>(Collections.USERS);
const userProfiles = db.collection<UserProfilesEntity>(Collections.USER_PROFILES);
const followers = db.collection<FollowersEntity>(Collections.FOLLOWERS);

export const updatePostCount = async (userId: ObjectId, count: 1 | -1) => {
  await userProfiles.updateOne({ userId }, { $inc: { postCount: count } });
};

export const updateFollowerCount = async (userId: ObjectId, count: 1 | -1) => {
  await userProfiles.updateOne({ userId }, { $inc: { followerCount: count } });
};

export const updateFollowingCount = async (userId: ObjectId, count: 1 | -1) => {
  await userProfiles.updateOne({ userId }, { $inc: { followingCount: count } });
};

export const getUserProfile = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);

  const user = await users.findOne({ _id: userId });

  return res.json({ user });
};

export const updateUserProfile = async (req: Request, res: Response) => {
  const body = req.body as UpdateUserInput;
  const userId = new ObjectId(req.user!.userId);
  console.log(body);

  const username = body.username
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

  const exists = await users.findOne({ username, _id: { $ne: userId } });
  try {
    if (exists) {
      return res.status(401).json({ message: 'Username already exists!' });
    }
    const user = await users.findOneAndUpdate(
      { _id: userId },
      { $set: { bio: body.bio, username, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
    const profiles = await userProfiles.findOneAndUpdate(
      { userId },
      { $set : {username, bio: body.bio, websiteURL: body.websiteURL, bannerURL: body.bannerURL, pronouns: body.pronouns} },
      { returnDocument: 'after' },
    );
    return res.json({ user, profiles });
  } catch (error) {
    console.error('Error in updating profile :', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFollowing = async (req: Request, res: Response) => {
  const followingUserId = new ObjectId(req.user!.userId);

  const following = await followers
    .aggregate([
      {
        $match: {
          followingUserId,
        },
      },
      {
        $lookup: {
          from: Collections.USER_PROFILES,
          localField: 'followedUserId',
          foreignField: 'userId',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
        },
      },
      {
        $replaceRoot: {
          newRoot: '$user',
        },
      },
    ])
    .toArray();

  return res.json({ following });
};

export const getFollowers = async (req: Request, res: Response) => {
  const followedUserId = new ObjectId(req.user!.userId);
  const follower = await followers
    .aggregate([
      {
        $match: {
          followedUserId,
        },
      },
      {
        $lookup: {
          from: Collections.USER_PROFILES,
          localField: 'followingUserId',
          foreignField: 'userId',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
        },
      },
      {
        $replaceRoot: {
          newRoot: '$user',
        },
      },
    ])
    .toArray();

  return res.json({ follower });
};

export const followProfile = async (req: Request, res: Response) => {
  const followingUserId = new ObjectId(req.user!.userId);
  const followedUserId = new ObjectId(req.params.userId);

  await followers.insertOne({ followingUserId, followedUserId, createdAt: new Date(), deletedAt: null });

  await updateFollowerCount(followedUserId, 1);
  await updateFollowingCount(followingUserId, 1);

  return res.json({ message: 'ok' });
};

export const unFollowProfile = async (req: Request, res: Response) => {
  const followingUserId = new ObjectId(req.user!.userId);
  const followedUserId = new ObjectId(req.params.userId);

  await followers.deleteOne({ followingUserId, followedUserId, deletedAt: new Date() });

  await updateFollowerCount(followedUserId, -1);
  await updateFollowingCount(followingUserId, -1);

  return res.json({ message: 'ok' });
};
