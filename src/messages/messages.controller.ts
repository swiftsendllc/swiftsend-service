import { Router } from 'express';
import { auth } from '../auth/middleware';
import { getMessages } from './messages.service';

const router = Router();

router.get('/messages', auth,  )


export default router;
