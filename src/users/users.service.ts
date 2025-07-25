import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import nodemailer from 'nodemailer';
import { shake } from 'radash';
import { onlineUsers } from '..';
import { FollowersEntity } from '../entities/followers.entity';
import { configService } from '../util/config';
import { Collections } from '../util/constants';
import { followersRepository, userProfilesRepository } from '../util/repositories';
import { SendEmailInput } from './dto/send-email.dto';
import { UpdateUserInput } from './dto/update-user.dto';

export const updatePostCount = async (userId: ObjectId, count: 1 | -1) => {
  await userProfilesRepository.updateOne({ userId }, { $inc: { postCount: count } });
};

export const updateFollowerCount = async (userId: ObjectId, count: 1 | -1) => {
  await userProfilesRepository.updateOne({ userId }, { $inc: { followerCount: count } });
};

export const updateFollowingCount = async (userId: ObjectId, count: 1 | -1) => {
  await userProfilesRepository.updateOne({ userId }, { $inc: { followingCount: count } });
};

export const getUserProfileByUsernameOrId = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const where = ObjectId.isValid(req.params.usernameOrId)
    ? { _id: new ObjectId(req.params.usernameOrId) }
    : { username: req.params.usernameOrId };

  const user = await userProfilesRepository.findOne(where);

  if (!user) return res.status(404).json({ message: 'User not found!' });

  const isOnline = onlineUsers.get(user.userId.toString());
  const [userProfile] = await userProfilesRepository
    .aggregate([
      {
        $match: where,
      },
      {
        $lookup: {
          from: Collections.FOLLOWERS,
          localField: 'userId',
          foreignField: 'followingUserId',
          pipeline: [
            {
              $match: {
                followedUserId: userId,
              },
            },
          ],
          as: '_follower',
        },
      },
      {
        $lookup: {
          from: Collections.FOLLOWERS,
          localField: 'userId',
          foreignField: 'followedUserId',
          pipeline: [
            {
              $match: {
                followingUserId: userId,
              },
            },
          ],
          as: '_following',
        },
      },
      {
        $lookup: {
          from: Collections.SUBSCRIPTIONS,
          localField: 'userId',
          foreignField: 'creatorId',
          pipeline: [
            {
              $match: { userId: userId },
            },
          ],
          as: '_subscriptions',
        },
      },
      {
        $lookup: {
          from: Collections.SUBSCRIPTION_PLANS,
          localField: 'userId',
          foreignField: 'creatorId',
          as: 'subscription_plans',
        },
      },
      {
        $set: {
          isFollowing: {
            $cond: [{ $gt: [{ $size: '$_follower' }, 0] }, true, false],
          },
          isFollowedByMe: {
            $cond: [{ $gt: [{ $size: '$_following' }, 0] }, true, false],
          },
          hasSubscribed: {
            $cond: [{ $or: [{ $gt: [{ $size: '$_subscriptions' }, 0] }, { $eq: ['$userId', userId] }] }, true, false],
          },
        },
      },
      {
        $project: {
          _follower: 0,
          _following: 0,
          _subscriptions: 0,
        },
      },
    ])
    .toArray();
  const data = {
    ...userProfile,
    isOnline: !!isOnline,
    lastSeen: isOnline?.lastActive || new Date(),
  };
  return res.status(200).json(data);
};

export const getUserProfiles = async (req: Request, res: Response) => {
  const text = req.query.q as string;
  if (!text) return res.status(400).json({ error: "Parameter can't be empty" });

  const result = await userProfilesRepository
    .aggregate([
      {
        $search: {
          index: 'profiles',
          compound: {
            should: [
              {
                text: {
                  query: text,
                  path: 'username',
                },
              },
              {
                text: {
                  query: text,
                  path: 'fullName',
                },
              },
            ],
          },
        },
      },
    ])
    .toArray();
  return res.json(result);
};

export const updateUserProfile = async (req: Request, res: Response) => {
  const body = req.body as UpdateUserInput;
  const userId = new ObjectId(req.user!.userId);

  const username = body.username
    ?.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

  const exists = await userProfilesRepository.findOne({ username, userId: { $ne: userId } });
  try {
    if (exists) {
      return res.status(409).json({ message: 'Username already exists!' });
    }

    const userProfile = await userProfilesRepository.findOneAndUpdate(
      { userId },
      {
        $set: shake({
          username,
          bio: body.bio,
          websiteURL: body.websiteURL,
          bannerURL: body.bannerURL,
          pronouns: body.pronouns,
          avatarURL: body.avatarURL,
          updatedAt: new Date(),
        }),
      },
      { returnDocument: 'after' },
    );

    const result = {
      ...userProfile,
    };
    return res.json(result);
  } catch (error) {
    console.error('Error in updating profile :', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFollowing = async (req: Request, res: Response) => {
  const followingUserId = new ObjectId(req.params.userId);
  const following = await followersRepository
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
          preserveNullAndEmptyArrays: true,
        },
      },
    ])
    .toArray();
  const data = await Promise.all(
    following.map(async (user) => {
      const loggedInUserId = new ObjectId(req.user!.userId);
      const isFollowing = await followersRepository.findOne({
        followingUserId: user.user.userId,
        followedUserId: loggedInUserId,
      });
      const receiverSocketData = onlineUsers.get(user.user.userId.toString());
      return {
        ...user,
        user: {
          ...user.user,
          isFollowing: !!isFollowing,
          isFollowedByMe: true,
          isOnline: !!receiverSocketData,
        },
      };
    }),
  );

  return res.json(data);
};

export const getFollowers = async (req: Request, res: Response) => {
  const followedUserId = new ObjectId(req.params.userId);
  const follower = await followersRepository
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
          preserveNullAndEmptyArrays: true,
        },
      },
    ])
    .toArray();
  const data = await Promise.all(
    follower.map(async (user) => {
      const loggedInUserId = new ObjectId(req.user!.userId);
      const isFollowedByMe = await followersRepository.findOne({
        followingUserId: loggedInUserId,
        followedUserId: user.user.userId,
      });
      const receiverSocketData = onlineUsers.get(user.user.userId.toString());
      return {
        ...user,
        user: {
          ...user.user,
          isFollowing: true,
          isFollowedByMe: !!isFollowedByMe,
          isOnline: !!receiverSocketData,
        },
      };
    }),
  );
  return res.json(data);
};

export const followProfile = async (req: Request, res: Response) => {
  const followingUserId = new ObjectId(req.user!.userId);
  const followedUserId = new ObjectId(req.params.userId);

  if (followingUserId.toString() === followedUserId.toString()) {
    return res.status(400).json({ message: "You can't follow  yourself!" });
  }
  const isFollowing = await followersRepository.findOne({ followedUserId, followingUserId });
  if (isFollowing) {
    return res.status(400).json({ message: 'ALREADY FOLLOWED' });
  }
  const followedProfile = {
    followingUserId,
    followedUserId,
    createdAt: new Date(),
    deletedAt: null,
  } as WithId<FollowersEntity>;
  const { insertedId } = await followersRepository.insertOne(followedProfile);
  Object.assign(followedProfile, { _id: insertedId });

  await updateFollowerCount(followedUserId, 1);
  await updateFollowingCount(followingUserId, 1);

  return res.status(200).json({ ...followedProfile, isFollowing: true });
};

export const unFollowProfile = async (req: Request, res: Response) => {
  const followingUserId = new ObjectId(req.user!.userId);
  const followedUserId = new ObjectId(req.params.userId);

  const { deletedCount } = await followersRepository.deleteOne({
    followingUserId,
    followedUserId,
  });
  if (!deletedCount) return res.status(400).json({ message: 'Nothing to unFollow!' });

  await updateFollowerCount(followedUserId, -1);
  await updateFollowingCount(followingUserId, -1);

  return res.status(200).json({ message: 'UNFOLLOWED' });
};

export const sendReport = async (req: Request, res: Response) => {
  const body = req.body as SendEmailInput;
  const to = body.to;
  if (!to.length) return res.status(400).json({ message: 'Recipient not found!' });
  if (!body.text || !body.subject) return res.status(400).json({ message: 'Content not found!' });
  const transporter = nodemailer.createTransport({
    host: configService.EMAIL_HOST,
    port: 587,
    secure: false,
    auth: {
      user: configService.EMAIL,
      pass: configService.APP_PASSWORD,
    },
  });
  const info = await transporter.sendMail({
    from: configService.EMAIL,
    to: to,
    subject: body.subject,
    text: body.text,
    cc: body.cc,
    bcc: body.bcc,
  });
  return res.status(200).json({ info: info });
};
