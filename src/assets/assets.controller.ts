import { Router } from 'express';
import multer from 'multer';
import { auth } from '../auth/middleware';
import { deleteCreatorAssets, getCreatorAssets, getFanAssets, uploadAndCreateAsset } from './assets.service';

const router = Router();

const upload = multer();

router.post('/assets/upload', auth, upload.single('file'), uploadAndCreateAsset);

router.get('/assets/creator', auth, getCreatorAssets);

router.get('/assets/fan', auth, getFanAssets);

router.delete('/assets/delete', auth, deleteCreatorAssets);

export default router;
