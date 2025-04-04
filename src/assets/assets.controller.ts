import { Router } from 'express';
import { auth } from '../auth/middleware';
import { createAsset, getCreatorAssets, getFanAssets } from './assets.service';

const router = Router();

router.post('/assets/create', auth, createAsset);

router.get('/assets/creator', auth, getCreatorAssets);

router.get('/assets/fan', auth, getFanAssets);

export default router;
