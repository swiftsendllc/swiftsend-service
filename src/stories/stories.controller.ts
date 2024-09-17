import { Router } from 'express';
import { auth } from '../auth/middleware';
import { createStory, deleteStory, getCreatorStories, getStories, likeStory } from './stories.service';

const router = Router();

router.get('/story', auth, getStories);

router.post('/story/create-story', auth, createStory);

router.get('/story/:userId/get-creator-stories', auth, getCreatorStories);

router.post('/story/:id/delete-story', auth, deleteStory);

router.post('/story/:id/like-story', auth, likeStory);

export default router;
