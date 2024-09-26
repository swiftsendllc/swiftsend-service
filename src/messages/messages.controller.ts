import { Router } from 'express';
import { auth } from '../auth/middleware';
import { deleteMessage, editMessage, sendMessage } from './messages.service';

const router = Router();

router.post('/messages', auth, sendMessage);

router.patch('/messages/:id/edit', auth, editMessage);

router.delete('/messages/:id/delete', auth, deleteMessage);

export default router;
