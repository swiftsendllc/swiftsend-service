import { Router } from 'express';
import { getAuthUser, login, signup } from './auth.service';
import { auth } from './middleware';

const router = Router();

router.post('/auth/login', login);

router.post('/auth/signup', signup);

router.get('/auth/status', auth, getAuthUser);

export default router;
