import { Router } from 'express';
import { auth } from '../auth/middleware';
import { deleteMessage, editMessage, sendMessage } from './messages.service';

const router = Router();

router.get('/messages', auth, sendMessage);

router.get('/edit', auth, editMessage);

router.get('/delete', auth, deleteMessage);

export default router;
