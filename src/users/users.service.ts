import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { FollowersEntity } from '../entities/followers.entity';
import { UsersEntity } from '../entities/users.entity';
import { db } from '../rdb/mongodb';
import { Collections } from '../util/constants';
import { UpdateUserInput } from './dto/update-user.dto';

const users = db.collection<UsersEntity>(Collections.USERS);
const followers = db.collection<FollowersEntity>(Collections.FOLLOWERS);

export const getUserProfile = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);

  const user = await users.findOne({ _id: userId });

  return res.json({ user });
};

export const updateUserProfile = async (req: Request, res: Response) => {
  const body = req.body as UpdateUserInput;

  const userId = new ObjectId(req.user!.userId);

  const username = body.username
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

  const exists = await users.findOne({ username, _id: { $ne: userId } });
  if (exists) {
    return res.status(401).json({ message: 'Username already exists!' });
  }
  const user = await users.findOneAndUpdate(
    { _id: userId },
    { $set: { bio: body.bio, username } },
    { returnDocument: 'after' },
  );
  return res.json({ user });
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
          from: Collections.USERS,
          localField: 'followedUserId',
          foreignField: '_id',
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
  // const follower = await followers.find({ followedUserId }).toArray();
  const follower = await followers
    .aggregate([
      {
        $match: {
          followedUserId,
        },
      },
      {
        $lookup: {
          from: Collections.USERS,
          localField: 'followingUserId',
          foreignField: '_id',
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

  await followers.insertOne({ followingUserId, followedUserId, createdAt: new Date() });
  await users.updateOne({ _id: followingUserId }, { $set: { followingCount: 1 } });
  await users.updateOne({ _id: followedUserId }, { $set: { followerCount: 1 } });

  return res.json({ message: 'ok' });
};

export const unFollowProfile = async (req: Request, res: Response) => {
  const followingUserId = new ObjectId(req.user!.userId);
  const followedUserId = new ObjectId(req.params.userId);

  await followers.deleteOne({ followingUserId, followedUserId });
  await users.updateOne({ _id: followingUserId }, { $set: { followingCount: -1 } });
  await users.updateOne({ _id: followingUserId }, { $set: { followerCount: -1 } });

  return res.json({ message: 'ok' });
};
