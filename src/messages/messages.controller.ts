import { Router } from 'express';
import { auth } from '../auth/middleware';
import {
  addMemberToGroup,
  createChannel,
  createGroup,
  deleteChannel,
  deleteGroup,
  deleteGroupMessage,
  deleteGroupReaction,
  deleteMessage,
  deleteMessageReactions,
  deleteMessages,
  demoteModeratorToMember,
  editGroupMessage,
  editMessage,
  forwardMessage,
  getChannelById,
  getChannelMedia,
  getChannelMessages,
  getChannels,
  getGroupById,
  getGroupMedia,
  getGroupMessages,
  getGroups,
  kickGroupMembers,
  kickMemberFromGroup,
  leaveGroup,
  promoteToAdmin,
  sendGroupMessage,
  sendGroupMessageReply,
  sendGroupReaction,
  sendMessage,
  sendMessageReactions,
  sendMessageReply,
  updateGroup,
  updateMemberToModerator,
} from './messages.service';

const router = Router();

router.get('/channels', auth, getChannels);

router.post('/channels/create/:receiverId', auth, createChannel);

router.post('/groups/create', auth, createGroup);

router.patch('/groups/update/:groupId', auth, updateGroup);

router.delete('/groups/delete/:groupId', auth, deleteGroup);

router.get('/groups', auth, getGroups);

router.get('/groups/:groupId', auth, getGroupById);

router.put('/groups/add/:groupId/:memberId', auth, addMemberToGroup);

router.patch('/groups/leave/:groupId', auth, leaveGroup);

router.patch('/groups/kick/:groupId', auth, kickGroupMembers);

router.patch('/groups/kick/:groupId/:memberId', auth, kickMemberFromGroup);

router.patch('/groups/demote/:groupId/:moderatorId', auth, demoteModeratorToMember);

router.put('/groups/update/:groupId/:memberId', auth, updateMemberToModerator);

router.patch('/groups/admin/:groupId/:moderatorId', auth, promoteToAdmin);

router.post('/groups/messages/send/:groupId', auth, sendGroupMessage);

router.post('/channels/messages/reply', auth, sendMessageReply);

router.post('/groups/messages/reply/:groupId', auth, sendGroupMessageReply);

router.post('/groups/messages/reactions/send', auth, sendGroupReaction);

router.delete('/groups/messages/reactions/delete/:reactionId', auth, deleteGroupReaction);

router.patch('/groups/messages/edit/:messageId', auth, editGroupMessage);

router.get('/groups/messages/get/:groupId', auth, getGroupMessages);

router.get('/groups/media/:groupId', auth, getGroupMedia);

router.delete('/groups/messages/delete/:messageId', auth, deleteGroupMessage);

router.delete('/channels/messages/delete', auth, deleteMessages);

router.delete('/channels/:id/delete', auth, deleteChannel);

router.get('/channels/:channelId', auth, getChannelById);

router.get('/channels/:channelId/messages', auth, getChannelMessages);

router.get('/channels/:channelId/media', auth, getChannelMedia);

router.post('/messages', auth, sendMessage);

router.post('/messages/reactions', auth, sendMessageReactions);

router.delete('/messages/reactions/:reactionId/delete', auth, deleteMessageReactions);

router.patch('/messages/:messageId/edit', auth, editMessage);

router.delete('/messages/delete/:messageId', auth, deleteMessage);

router.post('/messages/:id/:receiverId/forward', auth, forwardMessage);

export default router;
