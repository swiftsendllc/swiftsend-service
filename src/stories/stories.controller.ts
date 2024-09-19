import { Router } from 'express';
import { auth } from '../auth/middleware';
import { createStory, deleteStory, getCreatorStories, getLikesStory, getStories, likeStory } from './stories.service';

const router = Router();

router.get('/story', auth, getStories);

router.post('/story/create-story', auth, createStory);

router.get('/story/:userId', auth, getCreatorStories);

router.post('/story/:id/delete-story', auth, deleteStory);

router.post('/story/:id/like-story', auth, likeStory);

router.post('/story/:id/likes', auth, getLikesStory);

export default router;
