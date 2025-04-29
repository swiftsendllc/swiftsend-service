import { Router } from 'express';
import { auth } from '../auth/middleware';
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

router.get('/posts/:postId', auth, getPost);

router.get('/posts/creators/:userId', auth, getCreatorPosts);

router.post('/posts/create', auth, createPost);

router.delete('/posts/:postId/delete', auth, deletePost);

router.patch('/posts/:postId/edit', auth, editPost);

router.put('/posts/:postId/like', auth, likePost);

router.put('/posts/:postId/create-comment', auth, createComment);

router.delete('/posts/:postId/comments/:commentId', auth, deleteComment);

router.put('/posts/:postId/save', auth, savePost);

router.post('/posts/:postId/share', auth, sharePost);

router.get('/posts/:postId/likes', auth, getPostLikes);

router.get('/posts/user/liked', auth, getLikedPosts);

router.get('/posts/user/saved', auth, getSavedPosts);

router.get('/posts/user/commented', auth, getCommentsCreatedByYou);

export default router;
