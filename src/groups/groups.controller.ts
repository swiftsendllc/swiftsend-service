import { Router } from 'express';
import { auth, validateObjectId } from '../auth/middleware';
import {
  addMemberToGroup,
  createGroup,
  deleteGroup,
  deleteGroupMessage,
  deleteGroupReaction,
  demoteModeratorToMember,
  editGroupMessage,
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
  updateGroup,
  updateMemberToModerator,
} from './groups.service';

const router = Router();

router.post('/groups/create', auth, createGroup);

router.patch('/groups/update/:groupId', validateObjectId(['groupId']), auth, updateGroup);

router.delete('/groups/delete/:groupId', validateObjectId(['groupId']), auth, deleteGroup);

router.get('/groups', auth, getGroups);

router.get('/groups/:groupId', validateObjectId(['groupId']), auth, getGroupById);

router.put('/groups/add/:groupId/:memberId', validateObjectId(['groupId', 'memberId']), auth, addMemberToGroup);

router.patch('/groups/leave/:groupId', validateObjectId(['groupId']), auth, leaveGroup);

router.patch('/groups/kick/:groupId', validateObjectId(['groupId']), auth, kickGroupMembers);

router.patch('/groups/kick/:groupId/:memberId', validateObjectId(['groupId', 'memberId']), auth, kickMemberFromGroup);

router.patch(
  '/groups/demote/:groupId/:moderatorId',
  validateObjectId(['groupId', 'moderatorId']),
  auth,
  demoteModeratorToMember,
);

router.put(
  '/groups/update/:groupId/:memberId',
  validateObjectId(['groupId', 'memberId']),
  auth,
  updateMemberToModerator,
);

router.patch('/groups/admin/:groupId/:moderatorId', validateObjectId(['groupId', 'moderatorId']), auth, promoteToAdmin);

router.post('/groups/messages/send/:groupId', validateObjectId(['groupId']), auth, sendGroupMessage);

router.post('/groups/messages/reply/:groupId', validateObjectId(['groupId']), auth, sendGroupMessageReply);

router.post('/groups/messages/reactions/send', auth, sendGroupReaction);

router.patch('/groups/messages/edit/:messageId', validateObjectId(['messageId']), auth, editGroupMessage);

router.get('/groups/messages/get/:groupId', validateObjectId(['groupId']), auth, getGroupMessages);

router.get('/groups/media/:groupId', validateObjectId(['groupId']), auth, getGroupMedia);

router.delete('/groups/messages/delete/:messageId', validateObjectId(['messageId']), auth, deleteGroupMessage);

router.delete(
  '/groups/messages/reactions/delete/:reactionId',
  validateObjectId(['reactionId']),
  auth,
  deleteGroupReaction,
);

export default router;
