import { Router } from 'express';
import { auth } from '../auth/middleware';

const router = Router();


router.post('/reels', auth, )

export default router;
