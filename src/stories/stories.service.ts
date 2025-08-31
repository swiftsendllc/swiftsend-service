import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { LikesEntity } from '../entities/likes.entity';
import { Collections } from '../util/constants';
import { likesRepository, sharesRepository, storiesRepository } from '../util/repositories';
import { CreateStoryInput } from './dto/create-story.dto';
import { ShareStoryInput } from './dto/share-story.dto';

const getStoriesByUserId = async (userId: ObjectId) => {
  const result = await storiesRepository.find({ userId }).toArray();
  return result;
};

export const getStories = async (req: Request, res: Response): Promise<any> => {
  const userId = new ObjectId(req.user!.userId);
  const result = await getStoriesByUserId(userId);
  return res.json(result);
};

export const getCreatorStories = async (req: Request, res: Response): Promise<any> => {
  const userId = new ObjectId(req.params.userId);
  const result = await getStoriesByUserId(userId);
  return res.json(result);
};

export const createStory = async (req: Request, res: Response): Promise<any> => {
  const userId = new ObjectId(req.user!.userId);
  const body = req.body as CreateStoryInput;

  await storiesRepository.insertOne({
    userId,
    caption: body.caption,
    imageURL: body.imageURL,
    createdAt: new Date(),
    likeCount: 0,
  });
  return res.json({ message: 'ok' });
};

export const likeStory = async (req: Request, res: Response): Promise<any> => {
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
  await likesRepository.insertOne(like);
  const story = await storiesRepository.findOneAndUpdate(
    { _id: storyId },
    { $inc: { likeCount: 1 } },
    { returnDocument: 'after' },
  );

  return res.json({ story, like });
};

export const getLikesStory = async (req: Request, res: Response): Promise<any> => {
  const storyId = new ObjectId(req.params.id);
  const liked = await likesRepository
    .aggregate([
      {
        $match: {
          storyId,
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

export const deleteStory = async (req: Request, res: Response): Promise<any> => {
  const userId = new ObjectId(req.user!.userId);
  await storiesRepository.deleteOne({ userId });
  return res.json({ message: 'ok' });
};

export const shareStory = async (req: Request, res: Response): Promise<any> => {
  const body = req.body as ShareStoryInput;
  const sharingUserId = new ObjectId(req.params.userId);
  const sharedUserId = new ObjectId(body.sharedUserId);
  const storyId = new ObjectId(req.params.id);

  await sharesRepository.insertOne({ storyId, sharedUserId, sharingUserId, postId: null, reelsId: null });
};
