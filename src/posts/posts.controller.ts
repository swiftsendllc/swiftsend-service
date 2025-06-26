import { Router } from 'express';
import { auth, validateObjectId } from '../auth/middleware';
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  editPost,
  getCommentsCreatedByYou,
  getCreatorPosts,
  getLikedPosts,
  getPost,
  getPostLikes,
  getPosts,
  getSavedPosts,
  likePost,
  savePost,
  sharePost,
  timeline,
} from './posts.service';

const router = Router();

router.get('/posts', auth, getPosts);

router.get('/posts/timeline', auth, timeline);

router.get('/posts/:postId', validateObjectId(['postId']), auth, getPost);

router.get('/posts/creators/:creatorId', validateObjectId(['creatorId']), auth, getCreatorPosts);

router.post('/posts/create', auth, createPost);

router.delete('/posts/:postId/delete', validateObjectId(['postId']), auth, deletePost);

router.patch('/posts/:postId/edit', validateObjectId(['postId']), auth, editPost);

router.put('/posts/:postId/like', validateObjectId(['postId']), auth, likePost);

router.put('/posts/:postId/create-comment', validateObjectId(['postId']), auth, createComment);

router.delete('/posts/:postId/comments/:commentId', validateObjectId(['postId']), auth, deleteComment);

router.put('/posts/:postId/save', validateObjectId(['postId']), auth, savePost);

router.post('/posts/:postId/share', validateObjectId(['postId']), auth, sharePost);

router.get('/posts/:postId/likes', validateObjectId(['postId']), auth, getPostLikes);

router.get('/posts/user/liked', auth, getLikedPosts);

router.get('/posts/user/saved', auth, getSavedPosts);

router.get('/posts/user/commented', auth, getCommentsCreatedByYou);

export default router;
