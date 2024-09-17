import { Router } from 'express';
import { auth } from '../auth/middleware';
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  editPost,
  getCreatorPosts,
  getLikes,
  getPosts,
  likePost,
  savePost,
  sharePost,
} from './posts.service';

const router = Router();

router.get('/posts', auth, getPosts);

router.get('/posts/:userId', auth, getCreatorPosts);

router.post('/posts/create', auth, createPost);

router.delete('/posts/:id/delete', auth, deletePost);

router.patch('/posts/:id/edit', auth, editPost);

router.put('/posts/:id/like', auth, likePost);

router.put('/posts/:id/create-comment', auth, createComment);

router.delete('/posts/:id/delete-comment', auth, deleteComment);

router.put('/posts/:id/save-post', auth, savePost);

router.post('/posts/:id/share-post', auth, sharePost);

router.get('/posts/:id/likes', auth, getLikes);

export default router;
