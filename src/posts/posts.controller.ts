import { Router } from 'express';
import { auth } from '../auth/middleware';
import {
  createComment,
  createPost,
  createStory,
  deleteComment,
  deletePost,
  deleteStory,
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

router.post('/posts/:id/create-story', auth, createStory);

router.post('/posts/:id/delete-story', auth, deleteStory);

router.get('/posts/:id/get-liked-post', auth, getLikes);

export default router;
