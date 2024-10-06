import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { CommentsEntity } from '../entities/comments.entity';
import { LikesEntity } from '../entities/likes.entity';
import { ReelsEntity } from '../entities/reels.entity';
import { SavesEntity } from '../entities/saves.entity';
import { SharesEntity } from '../entities/shares.entity';
import { UsersEntity } from '../entities/users.entity';
import { db } from '../rdb/mongodb';
import { Collections } from '../util/constants';
import { CreateReelsInput } from './dto/create-reels.dto';
import { ShareReelInput } from './dto/share-reel.dto';
import { UpdateReelInput } from './dto/update-reel.dto';
import { CommentReelInput } from './dto/comment-reel.dto';

const reels = db.collection<ReelsEntity>(Collections.REELS);
const users = db.collection<UsersEntity>(Collections.USERS);
const likes = db.collection<LikesEntity>(Collections.LIKES);
const comments = db.collection<CommentsEntity>(Collections.COMMENTS);
const saves = db.collection<SavesEntity>(Collections.SAVES);
const shares = db.collection<SharesEntity>(Collections.SHARES);

const getReelsByUserId = async (userId: ObjectId) => {
  const result = await reels.find({ userId }).toArray();
  return result;
};

export const getReels = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const result = await getReelsByUserId(userId);
  return res.json(result);
};

export const getCreatorReels = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.params.userId);
  const result = await getReelsByUserId(userId);
  return res.json(result);
};

export const createReel = async (req: Request, res: Response) => {
  const body = req.body as CreateReelsInput;
  const userId = new ObjectId(req.user!.userId);
  await reels.insertOne({
    caption: body.caption,
    videoURL: body.videoURL,
    userId,
    likeCount: 0,
    saveCount: 0,
    shareCount: 0,
    commentCount: 0,
    createdAt: new Date(),
  });
  await users.updateOne({ _id: userId }, { $inc: { postCount: 1 } });
  return res.json({ message: 'ok' });
};

export const editReel = async (req: Request, res: Response) => {
  const body = req.body as UpdateReelInput;
  const userId = new ObjectId(req.user!.userId);
  await reels.updateOne({ _id: userId }, { $set: { caption: body.caption } });
  return res.json({ message: 'ok' });
};

export const deleteReel = async (req: Request, res: Response) => {
  const reelsId = new ObjectId(req.params.id);
  const userId = new ObjectId(req.user!.userId);
  await reels.deleteOne({ userId, _id: reelsId });
  await users.updateOne({ _id: userId }, { $inc: { postCount: -1 } });
  return res.json({ message: 'ok' });
};

export const likeReel = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const reelsId = new ObjectId(req.params.id);

  const liked = await likes.findOne({ userId, postId: reelsId });
  if (liked) {
    await likes.deleteOne({ userId, postId: reelsId });
    const reel = await reels.findOneAndUpdate(
      { _id: reelsId },
      { $inc: { likeCount: -1 } },
      { returnDocument: 'after' },
    );
    return res.json({ reel, like: liked });
  }

  const like: WithId<LikesEntity> = {
    _id: new ObjectId(),
    userId,
    reelsId,
    postId: null,
    storyId: null,
    createdAt: new Date(),
  };
  await likes.insertOne(like);
  const reel = await reels.findOneAndUpdate({ _id: reelsId }, { $inc: { likeCount: 1 } }, { returnDocument: 'after' });
  return res.json({ reel, like });
};

export const createComment = async (req: Request, res: Response) => {
  const body = req.body as CommentReelInput;
  const userId = new ObjectId(req.user!.userId);
  const reelsId = new ObjectId(req.params.id);

  const reel = await reels.findOneAndUpdate(
    { _id: reelsId },
    { $inc: { commentCount: 1 } },
    { returnDocument: 'after' },
  );
  if (reel) {
    const comment: WithId<CommentsEntity> = {
      _id: new ObjectId(),
      userId,
      postId: reelsId,
      comment: body.comment,
      createdAt: new Date(),
    };
    await comments.insertOne(comment);
    return res.json({ reel, comment });
  }
  return res.status(404).json('Reel not found ');
};

export const deleteComment = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const commentId = new ObjectId(req.params.id);

  const { deletedCount } = await comments.deleteOne({ userId, _id: commentId });
  if (deletedCount) {
    const reel = await reels.findOneAndUpdate(
      { _id: commentId },
      { $inc: { commentCount: -1 } },
      { returnDocument: 'after' },
    );
    return res.json(reel);
  }
  return res.status(404).json('Reel not found');
};

export const saveReel = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const reelsId = new ObjectId(req.params.id);
  const saved = await saves.findOne({ userId, reelsId });

  if (saved) {
    await saves.deleteOne({ reelsId, userId });
    await reels.updateOne({ userId, _id: reelsId }, { $inc: { saveCount: -1 } });
  } else {
    await saves.insertOne({ userId, reelsId, postId: null });
    await reels.updateOne({ userId, _id: reelsId }, { $inc: { saveCount: 1 } });
  }
  return res.json({ message: 'ok' });
};

export const shareReel = async (req: Request, res: Response) => {
  const body = req.body as ShareReelInput;
  const sharingUserId = new ObjectId(req.user!.userId);
  const sharedUserId = new ObjectId(body.shareUserId);
  const reelsId = new ObjectId(req.params.id);

  await shares.insertOne({ reelsId, sharedUserId, sharingUserId, postId: null, storyId: null });
  await reels.updateOne({ _id: reelsId }, { $inc: { shareCount: 1 } });

  return res.json({ message: 'ok' });
};

export const getLikes = async (req: Request, res: Response) => {
  const reelsId = new ObjectId(req.params.id);
  const liked = await likes
    .aggregate([
      {
        $match: {
          reelsId,
        },
      },
      {
        $lookup: {
          from: Collections.USER_PROFILES,
          localField: 'userId',
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

  return res.json({ liked });
};
