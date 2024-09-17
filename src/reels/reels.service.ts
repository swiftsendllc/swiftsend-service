import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { CommentsEntity } from '../entities/comments.entity';
import { LikesEntity } from '../entities/likes.entity';
import { ReelsEntity } from '../entities/reels.entity';
import { UsersEntity } from '../entities/users.entity';
import { CommentPostInput } from '../posts/dto/comment-post.dto';
import { db } from '../rdb/mongodb';
import { Collections } from '../util/constants';
import { CreateReelsInput } from './dto/create-reels.dto';
import { UpdateReelInput } from './dto/update-reel.dto';

const reels = db.collection<ReelsEntity>(Collections.REELS);
const users = db.collection<UsersEntity>(Collections.USERS);
const likes = db.collection<LikesEntity>(Collections.LIKES);
const comments = db.collection<CommentsEntity>(Collections.COMMENTS);

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
  const userId = new ObjectId(req.user!.userId);
  const result = getReelsByUserId(userId);
  return res.json(result);
};

export const createReels = async (req: Request, res: Response) => {
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
    postId: reelsId,
    createdAt: new Date(),
  };
  await likes.insertOne(like);
  const reel = await reels.findOneAndUpdate({ _id: reelsId }, { $inc: { likeCount: 1 } }, { returnDocument: 'after' });
  return res.json({ reel, like });
};

export const createComment = async (req: Request, res: Response) => {
  const body = req.body as CommentPostInput;
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
    return res.json(reel)
  }
  return res.status(404).json('Reel not found')
};
