import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { LikesEntity } from '../entities/likes.entity';
import { StoriesEntity } from '../entities/stories.entity';
import { db } from '../rdb/mongodb';
import { Collections } from '../util/constants';
import { CreateStoryInput } from './dto/create-story.dto';

const likes = db.collection<LikesEntity>(Collections.LIKES);
const stories = db.collection<StoriesEntity>(Collections.STORIES);

const getStoriesByUserId = async (userId: ObjectId) => {
  const result = await stories.find({ userId }).toArray();
  return result;
};

export const getStories = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const result = await getStoriesByUserId(userId);
  return res.json(result);
};

export const getCreatorStories = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.params.userId);
  const result = await getStoriesByUserId(userId);
  return res.json(result);
};

export const createStory = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const body = req.body as CreateStoryInput;

  await stories.insertOne({
    userId,
    caption: body.caption,
    imageURL: body.imageURL,
    createdAt: new Date(),
    likeCount: 0,
  });
  return res.json({ message: 'ok' });
};

export const likeStory = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const storyId = new ObjectId(req.params.id);

  const like: WithId<LikesEntity> = {
    _id: new ObjectId(),
    userId,
    storyId,
    postId: null,
    reelsId: null,
    createdAt: new Date(),
  };
  await likes.insertOne(like);
  const story = await stories.findOneAndUpdate(
    { _id: storyId },
    { $inc: { likeCount: 1 } },
    { returnDocument: 'after' },
  );

  return res.json({ story, like });
};

export const getLikesStory = async (req: Request, res: Response) => {
  const storyId = new ObjectId(req.params.id);
  const liked = await likes
    .aggregate([
      {
        $match: {
          storyId,
        },
      },
      {
        $lookup: {
          from: Collections.USERS,
          localField: 'userId',
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

  return res.json({ liked });
};

export const deleteStory = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  await stories.deleteOne({ userId });
  return res.json({ message: 'ok' });
};
