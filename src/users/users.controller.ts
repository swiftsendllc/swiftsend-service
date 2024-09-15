import { Router } from 'express';
import { auth } from '../auth/middleware';
import {
  followProfile,
  getFollowers,
  getFollowing,
  getUserProfile,
  unFollowProfile,
  updateUserProfile,
} from './users.service';

const router = Router();

router.get('/users/me', auth, getUserProfile);

router.patch('/users/me/edit', auth, updateUserProfile);

router.post('/users/:userId/follow-user', auth, followProfile);

router.post('/users/:userId/remove-follower', auth, unFollowProfile);

router.get('/users/:userId/followers', auth, getFollowers);

router.get('/users/:userId/following', auth, getFollowing);

export default router;
