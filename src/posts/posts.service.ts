import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { onlineUsers } from '..';
import { CommentsEntity } from '../entities/comments.entity';
import { LikesEntity } from '../entities/likes.entity';
import { SavesEntity } from '../entities/saves.entity';
import { redis } from '../rdb/redis';
import { updatePostCount } from '../users/users.service';
import { Collections } from '../util/constants';
import {
  commentsRepository,
  likesRepository,
  postAssetsRepository,
  postsRepository,
  savesRepository,
  sharesRepository,
} from '../util/repositories';
import { CommentPostInput } from './dto/comment-post.dto';
import { CreatePostInput } from './dto/create-post.dto';
import { SharePostInput } from './dto/share-post.dto';
import { UpdatePostInput } from './dto/update-post.dto';

const timelineKey = 'timeline-postsRepository';

const getPostsByUserId = async (userId: ObjectId, authUserId: ObjectId) => {
  const result = await postsRepository
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
            $cond: [
              {
                $or: [
                  { $gt: [{ $size: '$_purchased' }, 0] },
                  { $eq: ['$userId', userId] },
                  { $eq: ['$isExclusive', false] },
                ],
              },
              true,
              false,
            ],
          },
          imageUrls: {
            $cond: [
              {
                $or: [
                  { $gt: [{ $size: '$_purchased' }, 0] },
                  { $eq: ['$userId', userId] },
                  { $eq: ['$isExclusive', false] },
                ],
              },
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

  const [result] = await postsRepository
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
        $lookup: {
          from: Collections.POST_ASSETS,
          foreignField: 'postId',
          localField: '_id',
          as: '_post_assets',
        },
      },
      {
        $lookup: {
          from: Collections.ASSETS,
          foreignField: '_id',
          localField: '_post_assets.assetId',
          as: '_assets',
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
            $cond: [
              {
                $or: [
                  { $gt: [{ $size: '$_purchased' }, 0] },
                  { $eq: ['$userId', userId] },
                  { $eq: ['$isExclusive', false] },
                ],
              },
              true,
              false,
            ],
          },
          _assets: {
            $map: {
              input: '$_assets',
              as: 'asset',
              in: {
                _id: '$$asset._id',
                originalURL: {
                  $cond: [
                    {
                      $or: [
                        { $gt: [{ $size: '$_purchased' }, 0] },
                        { $eq: ['$userId', userId] },
                        { $eq: ['$isExclusive', false] },
                      ],
                    },
                    '$$asset.originalURL',
                    '$$asset.blurredURL',
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _likes: 0,
          _saves: 0,
          _following: 0,
          _purchased: 0,
          _post_assets: 0,
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
  const isExclusive = body.isExclusive;
  const assets = body.assetIds;

  const userId = new ObjectId(req.user!.userId);
  const { insertedId } = await postsRepository.insertOne({
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
    price: isExclusive ? body.price : null,
  });
  await updatePostCount(userId, 1);
  await Promise.all(
    assets.map(async (assetId) => {
      await postAssetsRepository.insertOne({
        assetId: new ObjectId(assetId),
        createdAt: new Date(),
        deletedAt: null,
        postId: insertedId,
        updatedAt: new Date(),
      });
    }),
  );

  await redis.del(timelineKey);
  return res.json({ message: 'POST IS CREATED' });
};

export const deletePost = async (req: Request, res: Response) => {
  const postId = new ObjectId(req.params.id);
  const userId = new ObjectId(req.user!.userId);
  await postsRepository.deleteOne({ userId, _id: postId });

  await updatePostCount(userId, -1);

  return res.json({ message: 'POST IS DELETED' });
};

export const editPost = async (req: Request, res: Response) => {
  const body = req.body as UpdatePostInput;
  const postId = new ObjectId(req.query.postId as string);
  const userId = new ObjectId(req.user!.userId);
  await postsRepository.updateOne({ userId, _id: postId }, { $set: { caption: body.caption } });
  return res.json({ message: 'POST IS EDITED' });
};

export const likePost = async (req: Request, res: Response) => {
  const postId = new ObjectId(req.params.id);
  const userId = new ObjectId(req.user!.userId);

  const liked = await likesRepository.findOne({ userId, postId });
  if (liked) {
    await likesRepository.deleteOne({ userId, postId });
    const post = await postsRepository.findOneAndUpdate(
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

  await likesRepository.insertOne(like);
  const post = await postsRepository.findOneAndUpdate(
    { _id: postId },
    { $inc: { likeCount: 1 } },
    { returnDocument: 'after' },
  );

  return res.json({ ...post, isLiked: true });
};

export const createComment = async (req: Request, res: Response) => {
  const body = req.body as CommentPostInput;
  const postId = new ObjectId(req.params.id);
  const userId = new ObjectId(req.user!.userId);

  const post = await postsRepository.findOneAndUpdate(
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
    await commentsRepository.insertOne(comment);
    return res.json({ post, comment });
  }

  return res.status(404).json({ message: 'Post not found' });
};

export const deleteComment = async (req: Request, res: Response) => {
  const postId = new ObjectId(req.params.postId);
  const commentId = new ObjectId(req.params.commentId);
  const userId = new ObjectId(req.user!.userId);

  const { deletedCount } = await commentsRepository.deleteOne({ userId, _id: commentId });
  if (deletedCount) {
    const post = await postsRepository.findOneAndUpdate(
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
  const saved = await savesRepository.findOne({ userId, postId });
  if (saved) {
    await savesRepository.deleteOne({ userId, postId });
    const post = await postsRepository.findOneAndUpdate(
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
  await savesRepository.insertOne(like);
  const post = await postsRepository.findOneAndUpdate(
    { userId, _id: postId },
    { $inc: { saveCount: 1 } },
    { returnDocument: 'after' },
  );

  return res.json({ ...post, isSaved: true });
};

export const getSavedPosts = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const savedPosts = await savesRepository
    .aggregate([
      {
        $match: { userId: userId },
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
        $lookup: {
          from: Collections.PURCHASES,
          localField: 'postId',
          foreignField: 'contentId',
          pipeline: [
            {
              $match: { userId: userId },
            },
          ],
          as: '_purchased',
        },
      },
      {
        $unwind: {
          path: '$post',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          imageUrls: {
            $cond: [
              {
                $or: [
                  { $eq: ['$$post.userId', userId] },
                  { $gt: [{ $size: '$_purchased' }, 0] },
                  { $eq: ['$$post.isExclusive', false] },
                ],
              },
              '$post.imageUrls',
              '$post.blurredImageUrls',
            ],
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$post',
              {
                imageUrls: {
                  $cond: [
                    {
                      $or: [
                        { $gt: [{ $size: '$_purchased' }, 0] },
                        { $eq: ['$$post.userId', userId] },
                        { $eq: ['$$post.isExclusive', false] },
                      ],
                    },
                    '$post.imageUrls',
                    '$post.blurredImageUrls',
                  ],
                },
              },
            ],
          },
        },
      },
    ])
    .toArray();
  return res.json(savedPosts);
};

export const getLikedPosts = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const likedPosts = await likesRepository
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
        $lookup: {
          from: Collections.PURCHASES,
          localField: 'postId',
          foreignField: 'contentId',
          as: '_purchased',
          pipeline: [
            {
              $match: { userId: userId },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$post',
        },
      },
      {
        $set: {
          imageUrls: {
            $cond: [
              {
                $or: [
                  { $gt: [{ $size: '$_purchased' }, 0] },
                  { $eq: ['$$post.userId', userId] },
                  { $eq: ['$$post.isExclusive', false] },
                ],
              },
              '$post.imageUrls',
              '$post.blurredImageUrls',
            ],
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$post',
              {
                imageUrls: {
                  $cond: [
                    {
                      $or: [
                        { $gt: [{ $size: '$_purchased' }, 0] },
                        { $eq: ['$$post.userId', userId] },
                        { $eq: ['$$post.isExclusive', false] },
                      ],
                    },
                    '$post.imageUrls',
                    '$post.blurredImageUrls',
                  ],
                },
              },
            ],
          },
        },
      },
    ])
    .toArray();
  return res.json(likedPosts);
};

export const getCommentsCreatedByYou = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const commentsByYou = await commentsRepository
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
  return res.json(commentsByYou);
};

export const sharePost = async (req: Request, res: Response) => {
  const body = req.body as SharePostInput;
  const sharingUserId = new ObjectId(req.user!.userId);
  const sharedUserId = new ObjectId(body.sharedUserId);
  const postId = new ObjectId(req.params.id);

  await sharesRepository.insertOne({ postId, sharedUserId, sharingUserId, reelsId: null, storyId: null });
  await postsRepository.updateOne({ _id: postId }, { $inc: { shareCount: 1 } });
  return res.json({ message: 'ok' });
};

export const getPostLikes = async (req: Request, res: Response) => {
  const postId = new ObjectId(req.params.id);
  const postLikes = await likesRepository
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

  return res.json({ postLikes });
};

export const timeline = async (req: Request, res: Response) => {
  // const cache = await redis.get(timelineKey);

  // if (cache) return res.json(JSON.parse(cache));

  const userId = new ObjectId(req.user!.userId);
  const offset = parseInt(req.query.offset as string) || 0;
  const limit = parseInt(req.query.limit as string) || 10;
  const result = await postsRepository
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
          localField: 'userId',
          foreignField: 'followedUserId',
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
            $cond: [{ $or: [{ $gt: [{ $size: '$_following' }, 0] }, { $eq: ['$userId', userId] }] }, true, false],
          },
          isPurchased: {
            $cond: [
              {
                $or: [
                  { $gt: [{ $size: '$_purchased' }, 0] },
                  { $eq: ['$userId', userId] },
                  { $eq: ['$isExclusive', false] },
                ],
              },
              true,
              false,
            ],
          },
          imageUrls: {
            $cond: [
              {
                $or: [
                  { $gt: [{ $size: '$_purchased' }, 0] },
                  { $eq: ['$userId', userId] },
                  { $eq: ['$isExclusive', false] },
                ],
              },
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
          _saves: 0,
          _purchased: 0,
          _following: 0,
          blurredImageUrls: 0,
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

  // await redis.set(timelineKey, JSON.stringify(data), { EX: 2 * 60 });
  return res.json(data);
};
