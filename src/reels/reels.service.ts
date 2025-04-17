import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { CommentsEntity } from '../entities/comments.entity';
import { LikesEntity } from '../entities/likes.entity';
import { updatePostCount } from '../users/users.service';
import { Collections } from '../util/constants';
import {
  commentsRepository,
  likesRepository,
  reelsRepository,
  savesRepository,
  sharesRepository,
  usersRepository,
} from '../util/repositories';
import { CommentReelInput } from './dto/comment-reel.dto';
import { CreateReelsInput } from './dto/create-reels.dto';
import { ShareReelInput } from './dto/share-reel.dto';
import { UpdateReelInput } from './dto/update-reel.dto';

const getReelsByUserId = async (userId: ObjectId) => {
  const result = await reelsRepository.find({ userId }).toArray();
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
  await reelsRepository.insertOne({
    caption: body.caption,
    videoURL: body.videoURL,
    userId,
    likeCount: 0,
    saveCount: 0,
    shareCount: 0,
    commentCount: 0,
    createdAt: new Date(),
  });
  await updatePostCount(userId, 1);
  return res.json({ message: 'ok' });
};

export const editReel = async (req: Request, res: Response) => {
  const body = req.body as UpdateReelInput;
  const reelsId = new ObjectId(req.params.id);
  const userId = new ObjectId(req.user!.userId);
  await reelsRepository.updateOne({ userId, _id: reelsId }, { $set: { caption: body.caption } });
  return res.json({ message: 'ok' });
};

export const deleteReel = async (req: Request, res: Response) => {
  const reelsId = new ObjectId(req.params.id);
  const userId = new ObjectId(req.user!.userId);
  await reelsRepository.deleteOne({ userId, _id: reelsId });
  await usersRepository.updateOne({ _id: userId }, { $inc: { postCount: -1 } });
  return res.json({ message: 'ok' });
};

export const likeReel = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const reelsId = new ObjectId(req.params.id);

  const liked = await likesRepository.findOne({ userId, postId: reelsId });
  if (liked) {
    await likesRepository.deleteOne({ userId, postId: reelsId });
    const reel = await reelsRepository.findOneAndUpdate(
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
  await likesRepository.insertOne(like);
  const reel = await reelsRepository.findOneAndUpdate(
    { _id: reelsId },
    { $inc: { likeCount: 1 } },
    { returnDocument: 'after' },
  );
  return res.json({ reel, like });
};

export const createComment = async (req: Request, res: Response) => {
  const body = req.body as CommentReelInput;
  const userId = new ObjectId(req.user!.userId);
  const reelsId = new ObjectId(req.params.id);

  const reel = await reelsRepository.findOneAndUpdate(
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
    await commentsRepository.insertOne(comment);
    return res.json({ reel, comment });
  }
  return res.status(404).json('Reel not found ');
};

export const deleteComment = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const commentId = new ObjectId(req.params.id);

  const { deletedCount } = await commentsRepository.deleteOne({ userId, _id: commentId });
  if (deletedCount) {
    const reel = await reelsRepository.findOneAndUpdate(
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
  const saved = await savesRepository.findOne({ userId, reelsId });

  if (saved) {
    await savesRepository.deleteOne({ reelsId, userId });
    await reelsRepository.updateOne({ userId, _id: reelsId }, { $inc: { saveCount: -1 } });
  } else {
    await savesRepository.insertOne({ userId, reelsId, postId: null });
    await reelsRepository.updateOne({ userId, _id: reelsId }, { $inc: { saveCount: 1 } });
  }
  return res.json({ message: 'ok' });
};

export const shareReel = async (req: Request, res: Response) => {
  const body = req.body as ShareReelInput;
  const sharingUserId = new ObjectId(req.user!.userId);
  const sharedUserId = new ObjectId(body.shareUserId);
  const reelsId = new ObjectId(req.params.id);

  await sharesRepository.insertOne({ reelsId, sharedUserId, sharingUserId, postId: null, storyId: null });
  await reelsRepository.updateOne({ _id: reelsId }, { $inc: { shareCount: 1 } });

  return res.json({ message: 'ok' });
};

export const getLikes = async (req: Request, res: Response) => {
  const reelsId = new ObjectId(req.params.id);
  const liked = await likesRepository
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
