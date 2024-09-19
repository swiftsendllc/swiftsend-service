import { Router } from 'express';
import { auth } from '../auth/middleware';
import {
  createComment,
  createReel,
  deleteComment,
  deleteReel,
  editReel,
  getCreatorReels,
  getLikes,
  getReels,
  likeReel,
  saveReel,
  shareReel,
} from './reels.service';

const router = Router();

router.get('/reels', auth, getReels);

router.get('/reels/:userId', auth, getCreatorReels);

router.post('/reels/create', auth, createReel);

router.patch('/reels/:id/edit', auth, editReel);

router.delete('/reels/;id/delete', auth, deleteReel);

router.put('/reels/:id/like', auth, likeReel);

router.put('/reels/:id/create-comment', auth, createComment);

router.delete('/reels/:id/delete-comment', auth, deleteComment);

router.put('/reels/:id/save', auth, saveReel);

router.post('/reels/:id/share', auth, shareReel);

router.get('/reels/:id/likes', auth, getLikes);

export default router;
