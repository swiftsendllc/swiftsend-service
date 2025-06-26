import { Router } from 'express';
import { auth, validateObjectId } from '../auth/middleware';
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
  sendMessageReply,
} from './messages.service';

const router = Router();

router.get('/channels', auth, getChannels); //

router.post('/channels/create/:receiverId', validateObjectId(['receiverId']), auth, createChannel);

router.delete('/channels/messages/delete', auth, deleteMessages);

router.delete('/channels/:id/delete', validateObjectId(['channelId']), auth, deleteChannel);

router.get('/channels/:channelId', validateObjectId(['channelId']), auth, getChannelById);

router.get('/channels/:channelId/messages', validateObjectId(['channelId']), auth, getChannelMessages);

router.get('/channels/:channelId/media', validateObjectId(['channelId']), auth, getChannelMedia);

router.post('/messages', auth, sendMessage);

router.post('/messages/reply', auth, sendMessageReply);

router.post('/messages/reactions', auth, sendMessageReactions);

router.delete('/messages/reactions/:reactionId/delete', validateObjectId(['reactionId']), auth, deleteMessageReactions);

router.patch('/messages/:messageId/edit', validateObjectId(['messageId']), auth, editMessage);

router.delete('/messages/delete/:messageId', validateObjectId(['messageId']), auth, deleteMessage);

router.post(
  '/messages/:messageId/:receiverId/forward',
  validateObjectId(['messageId', 'receiverId']),
  auth,
  forwardMessage,
);

export default router;
