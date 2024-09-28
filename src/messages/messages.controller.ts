import { Router } from 'express';
import { auth } from '../auth/middleware';
import { deleteMessage, editMessage, getChannelMessages, getChannels, sendMessage } from './messages.service';

const router = Router();

router.get('/channels', auth, getChannels);

router.get('/channels/:channelId/messages', auth, getChannelMessages);

router.post('/messages', auth, sendMessage);

router.patch('/messages/:id/edit', auth, editMessage);

router.delete('/messages/:id/delete', auth, deleteMessage);

export default router;
