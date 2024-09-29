import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { CommentsEntity } from '../entities/comments.entity';
import { LikesEntity } from '../entities/likes.entity';
import { PostsEntity } from '../entities/posts.entity';
import { SavesEntity } from '../entities/saves.entity';
import { SharesEntity } from '../entities/shares.entity';
import { UsersEntity } from '../entities/users.entity';
import { db } from '../rdb/mongodb';
import { updatePostCount } from '../users/users.service';
import { Collections } from '../util/constants';
import { CommentPostInput } from './dto/comment-post.dto';
import { CreatePostInput } from './dto/create-post.dto';
import { SharePostInput } from './dto/share-post.dto';
import { UpdatePostInput } from './dto/update-post.dto';

const posts = db.collection<PostsEntity>(Collections.POSTS);
const likes = db.collection<LikesEntity>(Collections.LIKES);
const comments = db.collection<CommentsEntity>(Collections.COMMENTS);
const saves = db.collection<SavesEntity>(Collections.SAVES);
const shares = db.collection<SharesEntity>(Collections.SHARES);
const users = db.collection<UsersEntity>(Collections.USERS);

const getPostsByUserId = async (userId: ObjectId) => {
  const result = await posts.find({ userId }).toArray();
  return result;
};

export const getPosts = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const result = await getPostsByUserId(userId);
  return res.json(result);
};

export const getCreatorPosts = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.params.userId);
  const result = await getPostsByUserId(userId);
  return res.json(result);
};

export const createPost = async (req: Request, res: Response) => {
  const body = req.body as CreatePostInput;
  const userId = new ObjectId(req.user!.userId);
  await posts.insertOne({
    caption: body.caption,
    imageURL: body.imageURL,
    userId,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    saveCount: 0,
    createdAt: new Date(),
  });
  await updatePostCount(userId, 1);

  return res.json({ message: 'ok' });
};

export const deletePost = async (req: Request, res: Response) => {
  const postId = new ObjectId(req.params.id);
  const userId = new ObjectId(req.user!.userId);
  await posts.deleteOne({ userId, _id: postId });

  await updatePostCount(userId, -1);

  return res.json({ message: 'ok' });
};

export const editPost = async (req: Request, res: Response) => {
  const body = req.body as UpdatePostInput;
  const postId = new ObjectId(req.params.id);
  const userId = new ObjectId(req.user!.userId);
  await posts.updateOne({ userId, _id: postId }, { $set: { caption: body.caption } });
  return res.json({ message: 'ok' });
};

export const likePost = async (req: Request, res: Response) => {
  const postId = new ObjectId(req.params.id);
  const userId = new ObjectId(req.user!.userId);

  const liked = await likes.findOne({ userId, postId });
  if (liked) {
    await likes.deleteOne({ userId, postId });
    const post = await posts.findOneAndUpdate(
      { _id: postId },
      { $inc: { likeCount: -1 } },
      { returnDocument: 'after' },
    );
    return res.json({ post, like: liked });
  }

  const like: WithId<LikesEntity> = {
    _id: new ObjectId(),
    userId,
    postId,
    reelsId: null,
    storyId: null,
    createdAt: new Date(),
  };

  await likes.insertOne(like);
  const post = await posts.findOneAndUpdate({ _id: postId }, { $inc: { likeCount: 1 } }, { returnDocument: 'after' });

  return res.json({ post, like });
};

export const createComment = async (req: Request, res: Response) => {
  const body = req.body as CommentPostInput;
  const postId = new ObjectId(req.params.id);
  const userId = new ObjectId(req.user!.userId);

  const post = await posts.findOneAndUpdate(
    { _id: postId },
    { $inc: { commentCount: 1 } },
    { returnDocument: 'after' },
  );

  if (post) {
    const comment: WithId<CommentsEntity> = {
      _id: new ObjectId(),
      userId,
      postId,
      comment: body.comment,
      createdAt: new Date(),
    };
    await comments.insertOne(comment);
    return res.json({ post, comment });
  }

  return res.status(404).json({ message: 'Post not found' });
};

export const deleteComment = async (req: Request, res: Response) => {
  const commentId = new ObjectId(req.params.id);
  const userId = new ObjectId(req.user!.userId);

  const { deletedCount } = await comments.deleteOne({ userId, _id: commentId });
  if (deletedCount) {
    const post = await posts.findOneAndUpdate(
      { _id: commentId },
      { $inc: { commentCount: -1 } },
      { returnDocument: 'after' },
    );

    return res.json(post);
  }

  return res.status(404).json({ message: 'Post not found' });
};

export const savePost = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const postId = new ObjectId(req.params.id);
  const saved = await saves.findOne({ userId, postId });
  if (saved) {
    await saves.deleteOne({ userId, postId });
    await posts.updateOne({ userId, _id: postId }, { $inc: { saveCount: -1 } });
  } else {
    await saves.insertOne({ userId, postId, reelsId: null });
    await posts.updateOne({ userId, _id: postId }, { $inc: { saveCount: 1 } });
  }
  return res.json({ message: 'ok' });
};

export const sharePost = async (req: Request, res: Response) => {
  const body = req.body as SharePostInput;
  const sharingUserId = new ObjectId(req.user!.userId);
  const sharedUserId = new ObjectId(body.sharedUserId);
  const postId = new ObjectId(req.params.id);

  await shares.insertOne({ postId, sharedUserId, sharingUserId, reelsId: null, storyId: null });
  await posts.updateOne({ _id: postId }, { $inc: { shareCount: 1 } });
  return res.json({ message: 'ok' });
};

export const getLikes = async (req: Request, res: Response) => {
  const postId = new ObjectId(req.params.id);
  const liked = await likes
    .aggregate([
      {
        $match: {
          postId,
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
