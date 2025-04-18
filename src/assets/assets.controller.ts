import { Router } from 'express';
import multer from 'multer';
import { auth } from '../auth/middleware';
import { getCreatorAssets, getFanAssets, uploadAndCreateAsset } from './assets.service';

const router = Router();

const upload = multer();

router.post('/assets/upload', auth, upload.single('file'), uploadAndCreateAsset);

router.get('/assets/creator', auth, getCreatorAssets);

router.get('/assets/fan', auth, getFanAssets);

export default router;
