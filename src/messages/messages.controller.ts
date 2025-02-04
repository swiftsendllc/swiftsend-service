import { Router } from 'express';
import { auth } from '../auth/middleware';
import {
  createChannel,
  deleteChannel,
  deleteMessage,
  deleteMessageReactions,
  deleteMessages,
  editMessage,
  forwardMessage,
  getChannelById,
  getChannelMedia,
  getChannelMessages,
  getChannels,
  sendMessage,
  sendMessageReactions,
} from './messages.service';

const router = Router();

router.get('/channels', auth, getChannels);

router.post('/channels/create/:userId', auth, createChannel);

router.delete('/channels/messages/delete', auth, deleteMessages);

router.delete('/channels/:id/delete', auth, deleteChannel);

router.get('/channels/:id', auth, getChannelById);

router.get('/channels/:channelId/messages', auth, getChannelMessages);

router.get('/channels/:channelId/media', auth, getChannelMedia);

router.post('/messages', auth, sendMessage);

router.post('/messages/reactions', auth, sendMessageReactions);

router.delete('/messages/reactions/:reactionId/delete', auth, deleteMessageReactions);

router.patch('/messages/:id/edit', auth, editMessage);

router.delete('/messages/:id/:deleted/delete', auth, deleteMessage);

router.post('/messages/:id/:receiverId/forward', auth, forwardMessage);

export default router;
