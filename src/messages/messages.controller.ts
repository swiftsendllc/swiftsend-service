import { Router } from 'express';
import { auth } from '../auth/middleware';
import {
  addMemberToGroup,
  createChannel,
  createGroup,
  deleteChannel,
  deleteGroupMessage,
  deleteMessage,
  deleteMessageReactions,
  deleteMessages,
  editMessage,
  forwardMessage,
  getChannelById,
  getChannelMedia,
  getChannelMessages,
  getChannels,
  getGroupById,
  getGroupMessages,
  getGroups,
  sendGroupMessage,
  sendMessage,
  sendMessageReactions,
} from './messages.service';

const router = Router();

router.get('/channels', auth, getChannels);

router.post('/channels/create/:userId', auth, createChannel);

router.post('/groups/create', auth, createGroup);

router.get('/groups', auth, getGroups);

router.get('/groups/:channelId', auth, getGroupById);

router.put('/groups/add/:channelId/:receiversId', auth, addMemberToGroup);

router.post('/groups/messages/send/:channelId', auth, sendGroupMessage);

router.get('/groups/messages/get/:channelId', auth, getGroupMessages);

router.delete('/groups/messages/delete/:messageId', auth, deleteGroupMessage);

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
