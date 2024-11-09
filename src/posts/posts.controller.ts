import { Router } from 'express';
import { auth } from '../auth/middleware';
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  editPost,
  getComment,
  getCreatorPosts,
  getLikes,
  getPost,
  getPosts,
  getSaves,
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

router.delete('/posts/:id/delete', auth, deletePost);

router.patch('/posts/:id/edit', auth, editPost);

router.put('/posts/:id/like', auth, likePost);

router.put('/posts/:id/create-comment', auth, createComment);

router.delete('/posts/:postId/comments/:commentId', auth, deleteComment);

router.put('/posts/:id/save', auth, savePost);

router.post('/posts/:id/share', auth, sharePost);

router.get('/posts/:id/likes', auth, getLikes);

router.get('/posts/saves', auth, getSaves);

router.get('/posts/:id/comments', auth, getComment);

export default router;
