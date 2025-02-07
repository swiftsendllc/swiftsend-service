import { Router } from 'express';
import { auth } from '../auth/middleware';
import {
  addMemberToChannelGroup,
  createChannel,
  createGroupChannel,
  deleteChannel,
  deleteChannelGroupMessage,
  deleteMessage,
  deleteMessageReactions,
  deleteMessages,
  editMessage,
  forwardMessage,
  getChannelById,
  getChannelGroupMessages,
  getChannelMedia,
  getChannelMessages,
  getChannels,
  getGroupChannel,
  sendGroupMessage,
  sendMessage,
  sendMessageReactions,
} from './messages.service';

const router = Router();

router.get('/channels', auth, getChannels);

router.post('/channels/create/:userId', auth, createChannel);

router.post('/groups/channels/create', auth, createGroupChannel);

router.put('/groups/channels/:channelId/:receiversId', auth, addMemberToChannelGroup);

router.delete('/channels/messages/delete', auth, deleteMessages);

router.delete('/channels/:id/delete', auth, deleteChannel);

router.get('/channels/:id', auth, getChannelById);

router.get('/channels/:channelId/messages', auth, getChannelMessages);

router.get('/channels/:channelId/media', auth, getChannelMedia);

router.post('/messages', auth, sendMessage);

router.post('/groups/messages/:channelId', auth, sendGroupMessage);

router.get("/groups/channels", auth, getGroupChannel)

router.get("/groups/channels/:channelId/messages", auth, getChannelGroupMessages)

router.delete("/groups/messages/:messageId/delete", auth, deleteChannelGroupMessage)

router.post('/messages/reactions', auth, sendMessageReactions);

router.delete('/messages/reactions/:reactionId/delete', auth, deleteMessageReactions);

router.patch('/messages/:id/edit', auth, editMessage);

router.delete('/messages/:id/:deleted/delete', auth, deleteMessage);

router.post('/messages/:id/:receiverId/forward', auth, forwardMessage);

export default router;
