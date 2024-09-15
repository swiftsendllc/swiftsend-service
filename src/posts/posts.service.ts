import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { CommentsEntity } from '../entities/comments.entity';
import { LikesEntity } from '../entities/likes.entity';
import { PostsEntity } from '../entities/posts.entity';
import { SavesEntity } from '../entities/saves.entity';
import { SharesEntity } from '../entities/shares.entity';
import { StoriesEntity } from '../entities/stories.entity';
import { UsersEntity } from '../entities/users.entity';
import { db } from '../rdb/mongodb';
import { Collections } from '../util/constants';
import { CommentPostInput } from './dto/comment-post.dto';
import { CreatePostInput } from './dto/create-post.dto';
import { CreateStoryInput } from './dto/create-story.dto';
import { SharePostInput } from './dto/share-post.dto';
import { UpdatePostInput } from './dto/update-post.dto';

const posts = db.collection<PostsEntity>(Collections.POSTS);
const likes = db.collection<LikesEntity>(Collections.LIKES);
const comments = db.collection<CommentsEntity>(Collections.COMMENTS);
const saves = db.collection<SavesEntity>(Collections.SAVES);
const shares = db.collection<SharesEntity>(Collections.SHARES);
const stories = db.collection<StoriesEntity>(Collections.STORIES);
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
  });
  await users.updateOne({ _id: userId }, { $inc: { postCount: 1 } });

  return res.json({ message: 'ok' });
};

export const deletePost = async (req: Request, res: Response) => {
  const postId = new ObjectId(req.params.id);
  const userId = new ObjectId(req.user!.userId);
  await posts.deleteOne({ userId, _id: postId });
  await users.updateOne({ _id: userId }, { $inc: { postCount: -1 } });

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
    await posts.updateOne({ userId, _id: postId }, { $inc: { likeCount: -1 } });
  } else {
    await likes.insertOne({ userId, postId });
    await posts.updateOne({ userId, _id: postId }, { $inc: { likeCount: 1 } });
  }
  return res.json({ message: 'ok' });
};

export const createComment = async (req: Request, res: Response) => {
  const body = req.body as CommentPostInput;
  const postId = new ObjectId(req.params.id);
  const userId = new ObjectId(req.user!.userId);
  await comments.insertOne({ userId, postId, comment: body.comments });
  await posts.updateOne({ userId, _id: postId }, { $inc: { commentCount: 1 } });

  return res.json({ message: 'Ok' });
};

export const deleteComment = async (req: Request, res: Response) => {
  const commentId = new ObjectId(req.params.id);
  const userId = new ObjectId(req.user!.userId);
  await comments.deleteOne({ userId, _id: commentId });
  await posts.updateOne({ userId, _id: commentId }, { $inc: { commentCount: -1 } });
  return res.json({ message: 'ok' });
};

export const savePost = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const postId = new ObjectId(req.params.id);
  const saved = await saves.findOne({ userId, postId });
  if (saved) {
    await saves.deleteOne({ userId, postId });
    await posts.updateOne({ userId, _id: postId }, { $inc: { saveCount: -1 } });
  } else {
    await saves.insertOne({ userId, postId });
    await posts.updateOne({ userId, _id: postId }, { $inc: { saveCount: 1 } });
  }
  return res.json({ message: 'ok' });
};

export const sharePost = async (req: Request, res: Response) => {
  const body = req.body as SharePostInput;
  const sharingUserId = new ObjectId(req.user!.userId);
  const sharedUserId = new ObjectId(body.sharedUserId);
  const postId = new ObjectId(req.params.id);

  await shares.insertOne({ postId, sharedUserId, sharingUserId });
  await posts.updateOne({ _id: postId }, { $inc: { shareCount: 1 } });
  return res.json({ message: 'ok' });
};

export const createStory = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const body = req.body as CreateStoryInput;

  await stories.insertOne({
    userId,
    caption: body.caption,
    imageURL: body.imageURL,
  });
  return res.json({ message: 'ok' });
};

export const deleteStory = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  await stories.deleteOne({ userId });
  return res.json({ message: 'ok' });
};
