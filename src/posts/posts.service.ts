import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { onlineUsers } from '..';
import { CommentsEntity } from '../entities/comments.entity';
import { LikesEntity } from '../entities/likes.entity';
import { PostsEntity } from '../entities/posts.entity';
import { SavesEntity } from '../entities/saves.entity';
import { SharesEntity } from '../entities/shares.entity';
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

const getPostsByUserId = async (userId: ObjectId, authUserId: ObjectId) => {
  const result = await posts
    .aggregate([
      {
        $match: { userId },
      },
      {
        $lookup: {
          from: Collections.LIKES,
          localField: '_id',
          foreignField: 'postId',
          as: '_likes',
          pipeline: [
            {
              $match: { userId: authUserId },
            },
            {
              $limit: 1,
            },
          ],
        },
      },
      {
        $lookup: {
          from: Collections.SAVES,
          localField: '_id',
          foreignField: 'postId',
          as: '_saves',
          pipeline: [
            {
              $match: { userId: authUserId },
            },
            {
              $limit: 1,
            },
          ],
        },
      },
      {
        $lookup: {
          from: Collections.PURCHASES,
          localField: '_id',
          foreignField: 'contentId',
          pipeline: [
            {
              $match: { userId: userId },
            },
            {
              $limit: 1,
            },
          ],
          as: '_purchased',
        },
      },
      {
        $set: {
          isLiked: {
            $cond: [{ $gt: [{ $size: '$_likes' }, 0] }, true, false],
          },
          isSaved: {
            $cond: [{ $gt: [{ $size: '$_saves' }, 0] }, true, false],
          },
          isPurchased: {
            $cond: [{ $gt: [{ $size: '$_purchased' }, 0] }, true, false],
          },
          imageUrls: {
            $cond: [
              { $or: [{ $gt: [{ $size: '$_purchased' }, 0] }, { $eq: ['$userId', userId] }] },
              '$imageUrls',
              '$blurredImageUrls',
            ],
          },
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
        $unwind: '$user',
      },
      {
        $project: {
          _likes: 0,
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
    ])
    .toArray();
  return result;
};

export const getPosts = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const result = await getPostsByUserId(userId, userId);
  return res.json(result);
};

export const getCreatorPosts = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const creatorId = new ObjectId(req.params.userId);

  const result = await getPostsByUserId(creatorId, userId);
  return res.json(result);
};

export const getPost = async (req: Request, res: Response) => {
  const postId = new ObjectId(req.params.postId);
  const userId = new ObjectId(req.user!.userId);

  const [result] = await posts
    .aggregate([
      {
        $match: { _id: postId },
      },
      {
        $lookup: {
          from: Collections.LIKES,
          localField: '_id',
          foreignField: 'postId',
          as: '_likes',
          pipeline: [
            {
              $match: { userId },
            },
            {
              $limit: 1,
            },
          ],
        },
      },
      {
        $lookup: {
          from: Collections.SAVES,
          localField: '_id',
          foreignField: 'postId',
          as: '_saves',
          pipeline: [
            {
              $match: { userId },
            },
            {
              $limit: 1,
            },
          ],
        },
      },
      {
        $lookup: {
          from: Collections.COMMENTS,
          localField: '_id',
          foreignField: 'postId',
          as: 'comments',
          pipeline: [
            {
              $sort: {
                _id: -1,
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
              $unwind: '$user',
            },
          ],
        },
      },
      {
        $lookup: {
          from: Collections.FOLLOWERS,
          localField: 'userId',
          foreignField: 'followedUserId',
          as: '_following',
          pipeline: [
            {
              $match: {
                followingUserId: userId,
              },
            },
            {
              $limit: 1,
            },
          ],
        },
      },
      {
        $lookup: {
          from: Collections.PURCHASES,
          localField: '_id',
          foreignField: 'contentId',
          pipeline: [
            {
              $match: { userId: userId },
            },
            {
              $limit: 1,
            },
          ],
          as: '_purchased',
        },
      },
      {
        $set: {
          isLiked: {
            $cond: [{ $gt: [{ $size: '$_likes' }, 0] }, true, false],
          },
          isSaved: {
            $cond: [{ $gt: [{ $size: '$_saves' }, 0] }, true, false],
          },
          isFollowing: {
            $cond: [{ $gt: [{ $size: '$_following' }, 0] }, true, false],
          },
          isPurchased: {
            $cond: [{ $gt: [{ $size: '$_purchased' }, 0] }, true, false],
          },
          imageUrls: {
            $cond: [
              { $or: [{ $gt: [{ $size: '$_purchased' }, 0] }, { $eq: ['$userId', userId] }] },
              '$imageUrls',
              '$blurredImageUrls',
            ],
          },
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
        $unwind: '$user',
      },
      {
        $project: {
          _likes: 0,
          _saves: 0,
          _following: 0,
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
    ])
    .toArray();
  const data = {
    ...result,
    comments: result.comments.map((comment: any) => ({
      ...comment,
      user: {
        ...comment.user,
        isOnline: onlineUsers.has(comment.user.userId.toString()),
      },
    })),
    user: {
      ...result.user,
      isOnline: onlineUsers.has(result.user.userId.toString()),
    },
  };

  return res.json(data);
};

export const createPost = async (req: Request, res: Response) => {
  const body = req.body as CreatePostInput;
  if (!body.blurredImageUrls || !body.imageUrls) {
    return res.status(400).json({ message: 'BODY NOT FOUND!' });
  }
  const isExclusive = body.isExclusive;

  if (isExclusive && body.price! < 200) {
    return res.status(400).json({ message: 'MINIMUM PRICE IS 200 INR' });
  }

  const userId = new ObjectId(req.user!.userId);
  await posts.insertOne({
    userId,
    likeCount: 0,
    saveCount: 0,
    status: false,
    shareCount: 0,
    deletedAt: null,
    commentCount: 0,
    caption: body.caption,
    createdAt: new Date(),
    purchasedBy: [userId],
    isExclusive: isExclusive,
    imageUrls: body.imageUrls,
    price: isExclusive ? body.price : null,
    blurredImageUrls: isExclusive ? body.blurredImageUrls : null,
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
    return res.json({ ...post, isLiked: false });
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

  return res.json({ ...post, isLiked: true });
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
  const postId = new ObjectId(req.params.postId);
  const commentId = new ObjectId(req.params.commentId);
  const userId = new ObjectId(req.user!.userId);

  const { deletedCount } = await comments.deleteOne({ userId, _id: commentId });
  if (deletedCount) {
    const post = await posts.findOneAndUpdate(
      { _id: postId },
      { $inc: { commentCount: -1 } },
      { returnDocument: 'after' },
    );

    return res.json(post);
  }

  return res.status(404).json({ message: 'Comment not found' });
};

export const savePost = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const postId = new ObjectId(req.params.id);
  const saved = await saves.findOne({ userId, postId });
  if (saved) {
    await saves.deleteOne({ userId, postId });
    const post = await posts.findOneAndUpdate(
      { userId, _id: postId },
      { $inc: { saveCount: -1 } },
      { returnDocument: 'after' },
    );
    return res.json({ ...post, isSaved: false });
  }
  const like: WithId<SavesEntity> = {
    _id: new ObjectId(),
    userId,
    postId,
    reelsId: null,
  };
  await saves.insertOne(like);
  const post = await posts.findOneAndUpdate(
    { userId, _id: postId },
    { $inc: { saveCount: 1 } },
    { returnDocument: 'after' },
  );

  return res.json({ ...post, isSaved: true });
};

export const getSaves = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const save = await saves
    .aggregate([
      {
        $match: { userId },
      },
      {
        $lookup: {
          from: Collections.POSTS,
          localField: 'postId',
          foreignField: '_id',
          as: 'post',
        },
      },
      {
        $unwind: {
          path: '$post',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $replaceRoot: {
          newRoot: '$post',
        },
      },
    ])
    .toArray();
  return res.json(save);
};

export const getPostsLikedByYou = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const like = await likes
    .aggregate([
      {
        $match: { userId },
      },
      {
        $lookup: {
          from: Collections.POSTS,
          localField: 'postId',
          foreignField: '_id',
          as: 'post',
        },
      },
      {
        $unwind: {
          path: '$post',
        },
      },
      {
        $replaceRoot: {
          newRoot: '$post',
        },
      },
    ])
    .toArray();
  return res.json(like);
};

export const getCommentsCreatedByYou = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const comment = await comments
    .aggregate([
      {
        $match: { userId },
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
        $unwind: '$user',
      },
    ])
    .toArray();
  return res.json(comment);
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

export const getPostLikes = async (req: Request, res: Response) => {
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

export const timeline = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const offset = parseInt(req.query.offset as string) || 0;
  const limit = parseInt(req.query.limit as string) || 10;
  const result = await posts
    .aggregate([
      {
        $lookup: {
          from: Collections.LIKES,
          localField: '_id',
          foreignField: 'postId',
          as: '_likes',
          pipeline: [
            {
              $match: { userId: userId },
            },
            {
              $limit: 1,
            },
          ],
        },
      },
      {
        $lookup: {
          from: Collections.SAVES,
          localField: '_id',
          foreignField: 'postId',
          as: '_saves',
          pipeline: [
            {
              $match: { userId: userId },
            },
            {
              $limit: 1,
            },
          ],
        },
      },
      {
        $lookup: {
          from: Collections.FOLLOWERS,
          let: { postUserId: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$followingUserId', userId] },
                    { $eq: ['$followedUserId', '$$postUserId'] },
                    { $eq: ['$deletedAt', null] },
                  ],
                },
              },
            },
            {
              $limit: 1,
            },
          ],
          as: '_following',
        },
      },
      {
        $lookup: {
          from: Collections.PURCHASES,
          localField: '_id',
          foreignField: 'contentId',
          pipeline: [
            {
              $match: { userId: userId },
            },
            {
              $limit: 1,
            },
          ],
          as: '_purchased',
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
        $unwind: '$user',
      },
      {
        $set: {
          isLiked: {
            $cond: [{ $gt: [{ $size: '$_likes' }, 0] }, true, false],
          },
          isSaved: {
            $cond: [{ $gt: [{ $size: '$_saves' }, 0] }, true, false],
          },
          isFollowing: {
            $cond: [{ $gt: [{ $size: '$_following' }, 0] }, true, false],
          },
          isPurchased: {
            $cond: [{ $gt: [{ $size: '$_purchased' }, 0] }, true, false],
          },
          imageUrls: {
            $cond: [
              { $or: [{ $gt: [{ $size: '$_purchased' }, 0] }, { $eq: ['$userId', userId] }] },
              '$imageUrls',
              '$blurredImageUrls',
            ],
          },
          isMyPost: {
            $cond: [{ $eq: ['$userId', userId] }, true, false],
          },
        },
      },
      {
        $project: {
          _likes: 0,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: offset,
      },
      {
        $limit: limit,
      },
    ])
    .toArray();
  const data = await Promise.all(
    result.map(async (user) => {
      const isOnline = onlineUsers.has(user.user.userId.toString());
      return {
        ...user,
        user: {
          ...user.user,
          isOnline: !!isOnline,
        },
      };
    }),
  );
  return res.json(data);
};
