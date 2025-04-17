import { Router } from 'express';
import multer from 'multer';
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

const upload = multer();

router.get('/posts', auth, getPosts);

router.get('/posts/timeline', auth, timeline);

router.get('/posts/:postId', auth, getPost);

router.get('/posts/creators/:userId', auth, getCreatorPosts);

router.post('/posts/create', auth, createPost);

router.delete('/posts/:id/delete', auth, deletePost);

router.patch('/posts/:postId/edit', auth, editPost);

router.put('/posts/:id/like', auth, likePost);

router.put('/posts/:id/create-comment', auth, createComment);

router.delete('/posts/:postId/comments/:commentId', auth, deleteComment);

router.put('/posts/:id/save', auth, savePost);

router.post('/posts/:id/share', auth, sharePost);

router.get('/posts/:id/likes', auth, getPostLikes);

router.get('/posts/user/liked', auth, getLikedPosts);

router.get('/posts/user/saved', auth, getSavedPosts);

router.get('/posts/user/commented', auth, getCommentsCreatedByYou);

export default router;
