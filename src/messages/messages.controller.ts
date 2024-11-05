import { Router } from 'express';
import { auth } from '../auth/middleware';
import {
  createChannel,
  deleteChannelMessages,
  deleteMessage,
  editMessage,
  getChannelById,
  getChannelMessages,
  getChannels,
  sendMessage,
} from './messages.service';

const router = Router();

router.get('/channels', auth, getChannels);

router.post('/channels/create/:userId', auth, createChannel);

router.delete('/channels/delete/:channelId', auth, deleteChannelMessages);

router.get('/channels/:id', auth, getChannelById);

router.get('/channels/:channelId/messages', auth, getChannelMessages);

router.post('/messages', auth, sendMessage);

router.patch('/messages/:id/edit', auth, editMessage);

router.delete('/messages/:id/delete', auth, deleteMessage);

export default router;
