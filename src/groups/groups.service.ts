import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { shake } from 'radash';
import { io, onlineUsers } from '..';
import { GroupMessagesEntity } from '../entities/group-messages.entity';
import { GroupReactionsEntity } from '../entities/group-reactions.entity';
import { GroupsEntity } from '../entities/groups.entity';
import { UserProfilesEntity } from '../entities/user-profiles.entity';
import { DeleteMembersInput } from '../messages/dto/delete-members.dto';
import { EditGroupMessageInput } from '../messages/dto/edit-group-message.dto';
import { GroupCreateInput } from '../messages/dto/group-create.dto';
import { SendGroupMessageInput } from '../messages/dto/send-group-message.dto';
import { SendGroupReactionInput } from '../messages/dto/send-group-reaction.dto';
import { SendGroupMessageReplyInput } from '../messages/dto/send-group-reply.dto';
import { UpdateGroupInput } from '../messages/dto/update-group.dto';
import { Collections } from '../util/constants';
import {
  groupMessagesRepository,
  groupReactionsRepository,
  groupRepliesRepository,
  groupsRepository,
  userProfilesRepository,
} from '../util/repositories';

export const createGroup = async (req: Request, res: Response) => {
  const adminId = new ObjectId(req.user!.userId);
  const body = req.body as GroupCreateInput;
  const newGroup: WithId<GroupsEntity> = {
    _id: new ObjectId(),
    participants: [adminId],
    createdAt: new Date(),
    groupName: body.groupName,
    description: body.description,
    groupAvatar: body.groupAvatar || null,
    adminId: adminId,
    moderators: [adminId],
  };

  await groupsRepository.insertOne(newGroup);
  return res.status(200).json(newGroup);
};

export const updateGroup = async (req: Request, res: Response) => {
  const adminId = new ObjectId(req.user!.userId);
  const body = req.body as UpdateGroupInput;
  console.log(req.params.groupId);
  const groupId = new ObjectId(req.params.groupId);

  const group = await groupsRepository.findOneAndUpdate(
    { _id: groupId, adminId: adminId },
    {
      $set: shake({
        groupName: body.groupName,
        groupAvatar: body.groupAvatar,
        description: body.description,
      }),
    },
    { returnDocument: 'after' },
  );
  return res.status(200).json({ ...group });
};

export const deleteGroup = async (req: Request, res: Response) => {
  const adminId = new ObjectId(req.user!.userId);
  const groupId = new ObjectId(req.params.groupId);

  const isAdmin = await groupsRepository.findOne({ _id: groupId, admin: adminId });

  if (!isAdmin) {
    return res.status(401).json({ message: 'UNAUTHORIZED!' });
  }

  await groupsRepository.deleteOne({ _id: groupId, admin: adminId });
  return res.status(200).json({ message: 'OK' });
};

export const addMemberToGroup = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const memberId = new ObjectId(req.params.memberId);
  const groupId = new ObjectId(req.params.groupId);

  const group = await groupsRepository.findOne({ _id: groupId });

  if (!group) return res.status(404).json({ message: 'GROUP NOT FOUND!' });
  const isMember = await groupsRepository.findOne({ _id: groupId, participants: { $in: [memberId] } });

  if (isMember) {
    return res.status(400).json({ message: 'USER ALREADY EXISTS IN THE GROUP!' });
  }
  const updatedGroup = await groupsRepository.findOneAndUpdate(
    { _id: groupId, participants: { $in: [userId] } },
    { $addToSet: { participants: memberId } },
    { returnDocument: 'after' },
  );
  return res.status(200).json({ ...updatedGroup });
};

export const updateMemberToModerator = async (req: Request, res: Response) => {
  const adminId = new ObjectId(req.user!.userId);
  const groupId = new ObjectId(req.params.groupId);
  const group = await groupsRepository.findOne({ _id: groupId });
  const memberId = new ObjectId(req.params.memberId);
  if (!group) return res.status(404).json({ message: 'GROUP NOT FOUND!' });

  if (group) {
    const isMember = await groupsRepository.findOne({ _id: groupId, participants: memberId });
    const isModerator = await groupsRepository.findOne({ _id: groupId, moderators: memberId });

    if (isModerator) return res.status(400).json({ message: "ALREADY IN YOUR MODERATOR\'S LIST" });

    if (isMember) {
      await groupsRepository.updateOne({ _id: groupId, adminId: adminId }, { $addToSet: { moderators: memberId } });
      return res.status(200).json({ message: 'PROMOTED' });
    } else {
      return res.status(200).json({ message: "THE USER IS NOT IN YOUR PARTICIPANT'S LIST!" });
    }
  }
};

export const getGroups = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const groupData = await groupsRepository
    .aggregate([
      {
        $match: { participants: { $in: [userId] } },
      },
      {
        $lookup: {
          from: Collections.GROUP_MESSAGES,
          localField: '_id',
          foreignField: 'groupId',
          as: 'lastMessage',
          pipeline: [
            {
              $sort: { createdAt: -1 },
            },
            {
              $limit: 1,
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$lastMessage',
          preserveNullAndEmptyArrays: true,
        },
      },
    ])
    .toArray();
  if (!groupData) {
    console.log(groupData);
    return res.status(404).json({ message: 'data not found' });
  }

  return res.status(200).json(groupData);
};

export const sendGroupMessage = async (req: Request, res: Response) => {
  const senderId = new ObjectId(req.user!.userId);
  const body = req.body as SendGroupMessageInput;
  const groupId = new ObjectId(req.params.groupId);
  const group = await groupsRepository.findOne({ _id: groupId });
  const price = body.price * 100;
  const isParticipant = group?.participants.includes(senderId);
  if (!isParticipant) {
    return res.status(400).json({ message: 'YOU ARE NOT AUTHORIZED TO MESSAGE!' });
  }
  const receiversId = group?.participants.filter((id) => !id.equals(senderId));

  if (receiversId) {
    const groupMessage = {
      groupId: groupId,
      senderId: senderId,
      receiversId: receiversId,
      message: body.message,
      imageURL: body.imageURL ?? null,
      createdAt: new Date(),
      deletedAt: null,
      editedAt: null,
      deleted: false,
      edited: false,
      repliedTo: null,
      isExclusive: body.isExclusive ?? false,
      price: price ?? null,
      purchasedBy: [senderId],
    } as WithId<GroupMessagesEntity>;
    const { insertedId } = await groupMessagesRepository.insertOne(groupMessage);
    Object.assign(groupMessage, { _id: insertedId });

    const sender = await userProfilesRepository.findOne({ userId: senderId });
    const receivers = receiversId.map((id) => id.toString()) as [];
    io.to(receivers).emit('groupMessage', { ...groupMessage, sender });
    return res.json({ ...groupMessage, sender });
  }
};

export const getGroupMessages = async (req: Request, res: Response) => {
  const groupId = new ObjectId(req.params.groupId);
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const groupMessagesRepositoryData = await groupMessagesRepository
    .aggregate([
      {
        $match: { groupId },
      },
      {
        $lookup: {
          from: Collections.GROUPS,
          localField: 'groupId',
          foreignField: '_id',
          as: 'group',
        },
      },
      {
        $unwind: {
          path: '$group',
        },
      },
      {
        $lookup: {
          from: Collections.USER_PROFILES,
          localField: 'receiversId',
          foreignField: 'userId',
          as: 'receivers',
        },
      },
      {
        $lookup: {
          from: Collections.USER_PROFILES,
          localField: 'senderId',
          foreignField: 'userId',
          as: 'sender',
        },
      },
      {
        $unwind: { path: '$sender' },
      },
      {
        $lookup: {
          from: Collections.GROUP_MESSAGES,
          localField: '_id',
          foreignField: 'repliedTo',
          as: 'repliedMessage',
        },
      },
      {
        $unwind: {
          path: '$repliedMessage',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: Collections.USER_PROFILES,
          localField: 'repliedMessage.senderId',
          foreignField: 'userId',
          as: 'repliedMessageSender',
        },
      },
      {
        $unwind: {
          path: '$repliedMessageSender',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: Collections.GROUP_REPLIES,
          localField: '_id',
          foreignField: 'messageId',
          as: 'replies',
        },
      },
      {
        $lookup: {
          from: Collections.GROUP_REACTIONS,
          localField: '_id',
          foreignField: 'messageId',
          as: 'reactions',
          pipeline: [{ $sort: { createdAt: -1 } }, { $limit: 1 }],
        },
      },
      {
        $set: {
          isReacted: {
            $cond: [{ $gt: [{ $size: '$reactions' }, 0] }, true, false],
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: offset,
      },
      {
        $limit: limit,
      },
    ])
    .toArray();
  const updatedMessages = groupMessagesRepositoryData.map((message) => {
    return {
      ...message,
      receivers: message.receivers.map((receiver: UserProfilesEntity) => {
        return {
          ...receiver,
          isOnline: !!onlineUsers.get(receiver.userId.toString()),
        };
      }),
      sender: {
        ...message.sender,
        isOnline: !!onlineUsers.get(message.sender.userId.toString()),
      },
    };
  });

  return res.status(200).json(updatedMessages);
};

export const getGroupById = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const groupId = new ObjectId(req.params.groupId);
  const [group] = await groupsRepository
    .aggregate([
      {
        $match: { _id: groupId },
      },
      {
        $lookup: {
          from: Collections.USER_PROFILES,
          localField: 'participants',
          foreignField: 'userId',
          as: 'members',
        },
      },
      {
        $lookup: {
          from: Collections.USER_PROFILES,
          localField: 'adminId',
          foreignField: 'userId',
          as: '_admin',
        },
      },
      {
        $unwind: {
          path: '$_admin',
        },
      },
      {
        $set: {
          isAdmin: { $eq: ['$adminId', userId] },
          isModerator: { $in: [userId, '$moderators'] },
        },
      },
    ])
    .toArray();
  return res.status(200).json(group);
};

export const editGroupMessage = async (req: Request, res: Response) => {
  const senderId = new ObjectId(req.user!.userId);
  const messageId = new ObjectId(req.params.messageId);
  const body = req.body as EditGroupMessageInput;
  if (!body) {
    return res.status(400).json({ message: 'BODY NOT FOUND!' });
  }
  const result = await groupMessagesRepository.updateOne(
    { _id: messageId, senderId: senderId },
    { $set: { message: body.message, edited: true, editedAt: new Date() } },
  );
  if (result.modifiedCount > 0) {
    const updateGroupMessage = await groupMessagesRepository.findOne({ _id: messageId });
    const receiverSocketId: ObjectId[] = updateGroupMessage?.receiversId || [];
    const receivers = receiverSocketId.map((id) => id.toString()) as [];
    io.to(receivers).emit('group_message_edited', {
      _id: messageId,
      message: body.message,
      edited: true,
      editedAt: new Date(),
    });
  }
  return res.json(result);
};

export const deleteGroupMessage = async (req: Request, res: Response) => {
  const senderId = new ObjectId(req.user!.userId);
  const messageId = new ObjectId(req.params.messageId);
  const messages = await groupMessagesRepository.findOne({ _id: messageId });
  const result = await groupMessagesRepository.updateOne(
    { _id: messageId, senderId: senderId },
    { $set: { message: '', imageURL: '', deleted: true, deletedAt: new Date() } },
  );
  if (result.modifiedCount > 0) {
    const receiverSocketId: ObjectId[] = messages?.receiversId || [];
    const receivers = receiverSocketId.map((id) => id.toString()) as [];
    io.to(receivers).emit('group_message_deleted', {
      _id: messageId,
      message: '',
      imageURL: '',
      deleted: true,
      deletedAt: new Date(),
    });
  }
  await groupMessagesRepository.deleteOne({ _id: messageId, senderId: senderId });
  return res.status(200).json({ message: 'MESSAGE DELETED' });
};

export const leaveGroup = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const groupId = new ObjectId(req.params.groupId);
  const isAdmin = await groupsRepository.findOne({ _id: groupId, admin: userId });
  if (isAdmin) {
    return res.status(400).json({ message: 'TRANSFER LEADERSHIP TO ANY MODERATOR TO LEAVE THE GROUP!' });
  }

  await groupsRepository.updateOne({ _id: groupId }, { $pull: { participants: userId, moderators: userId } });

  return res.status(200).json({ message: 'LEFT THE GROUP' });
};

export const promoteToAdmin = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const groupId = new ObjectId(req.params.groupId);
  const moderatorId = new ObjectId(req.params.moderatorId);

  const group = await groupsRepository.findOne({ _id: groupId });

  if (!group) return res.status(404).json({ message: 'GROUP NOT FOUND!' });

  const isAdmin = group.adminId.equals(userId);
  const isModerator = group.moderators.map((id) => id.equals(moderatorId));

  if (!isAdmin) return res.status(401).json({ message: 'UNAUTHORIZED!' });

  if (!isModerator) return res.status(400).json({ message: 'UPDATE MEMBER TO MODERATOR TO SET AS A ADMIN' });

  const updatedGroup = await groupsRepository.findOneAndUpdate(
    { _id: groupId },
    { $set: { adminId: moderatorId } },
    { returnDocument: 'after' },
  );

  return res.status(200).json(updatedGroup);
};

export const kickMemberFromGroup = async (req: Request, res: Response) => {
  const adminId = new ObjectId(req.user!.userId);
  const groupId = new ObjectId(req.params.groupId);
  const memberId = new ObjectId(req.params.memberId);
  const group = await groupsRepository.findOne({ _id: groupId });

  if (!group) return res.status(404).json({ message: 'GROUP NOT FOUND!❌' });

  const isModerator = await groupsRepository.findOne({ _id: groupId, moderators: { $in: [memberId] } });
  if (isModerator) {
    await groupsRepository.updateOne(
      { _id: groupId, adminId: adminId },
      { $pull: { participants: memberId, moderators: memberId } },
    );
    return res.status(200).json({ message: 'KICKED IN THE ASS #MODERATOR' });
  } else {
    await groupsRepository.updateOne({ _id: groupId, adminId: adminId }, { $pull: { participants: memberId } });
    return res.status(200).json({ message: 'KICKED IN THE ASS 🍑' });
  }
};

export const kickGroupMembers = async (req: Request, res: Response) => {
  const adminId = new ObjectId(req.user!.userId);
  const body = req.body as DeleteMembersInput;
  const groupId = new ObjectId(req.params.groupId);

  const membersId = body.membersId.map((id) => new ObjectId(id));
  const moderators = await groupsRepository.findOne({ _id: groupId, moderators: { $in: membersId } });
  if (moderators) {
    await groupsRepository.updateMany(
      { _id: groupId, adminId: adminId },
      // @ts-expect-error
      { $pull: { participants: { $in: membersId }, moderators: { $in: membersId } } },
      { returnDocument: 'after' },
    );

    return res.status(200).json({ message: 'KICKED IN THE ASS 🍑' });
  } else {
    const kickedParticipants = await groupsRepository.findOneAndUpdate(
      { _id: groupId, adminId: adminId },
      // @ts-expect-error
      { $pull: { participants: { $in: membersId } } },
      { returnDocument: 'after' },
    );
    return res.status(200).json(kickedParticipants);
  }
};

export const demoteModeratorToMember = async (req: Request, res: Response) => {
  const adminId = new ObjectId(req.user!.userId);
  const moderatorId = new ObjectId(req.params.moderatorId);
  const groupId = new ObjectId(req.params.groupId);
  const demoteModerator = await groupsRepository.findOneAndUpdate(
    { _id: groupId, adminId: adminId },
    { $pull: { moderators: moderatorId } },
    { returnDocument: 'after' },
  );
  return res.status(200).json(demoteModerator);
};

export const getGroupMedia = async (req: Request, res: Response) => {
  const groupId = new ObjectId(req.params.groupId);
  const userId = new ObjectId(req.user!.userId);
  const groupMedia = await groupMessagesRepository
    .aggregate([
      {
        $match: { groupId: groupId, receiversId: userId, imageURL: { $ne: null } },
      },
      {
        $project: { imageURL: 1 },
      },
    ])
    .toArray();

  return res.status(200).json(groupMedia);
};

export const sendGroupReaction = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const body = req.body as SendGroupReactionInput;
  const messageId = new ObjectId(body.messageId);

  const reaction = {
    messageId: body.messageId,
    reaction: body.reaction,
    createdAt: new Date(),
    senderId: userId,
  } as WithId<GroupReactionsEntity>;

  const { insertedId } = await groupReactionsRepository.insertOne(reaction);
  Object.assign(reaction, { _id: insertedId });

  const groupMessage = await groupMessagesRepository.findOne({ _id: messageId, senderId: userId });

  const receiverSocketId: ObjectId[] = groupMessage?.receiversId || [];
  const receivers = receiverSocketId.map((id) => id.toString()) || '';
  io.to(receivers).emit('group_message_reacted', { ...reaction, isReacted: true });

  return res.status(200).json({ ...groupMessage, isReacted: true });
};

export const deleteGroupReaction = async (req: Request, res: Response) => {
  const reactionId = new ObjectId(req.params.reactionId);
  const senderId = new ObjectId(req.user!.userId);
  await groupReactionsRepository.deleteOne({ _id: reactionId, senderId: senderId });

  const reaction = await groupReactionsRepository.findOne({ _id: reactionId });
  const messageId = reaction?.messageId;

  const groupMessage = await groupMessagesRepository.findOne({ _id: messageId });

  const receiverSocketId = groupMessage?.receiversId || [];
  const receivers = receiverSocketId.map((id) => id.toString()) || [];

  io.to(receivers).emit('group_reaction_deleted', {
    userId: senderId,
    reactionId: reactionId,
  });

  return res.json({ ...groupMessage, isReacted: false });
};

export const sendGroupMessageReply = async (req: Request, res: Response) => {
  const senderId = new ObjectId(req.user!.userId);
  const groupId = new ObjectId(req.params.groupId);
  const body = req.body as SendGroupMessageReplyInput;
  const messageId = new ObjectId(body.messageId);
  const price = body.price * 100;
  const group = await groupsRepository.findOne({ _id: groupId });
  const receiversId = group?.participants.filter((id) => !id.equals(senderId));
  if (receiversId) {
    const replyMessage = {
      senderId,
      receiversId,
      groupId: groupId,
      createdAt: new Date(),
      deleted: false,
      edited: false,
      editedAt: null,
      deletedAt: null,
      imageURL: body.imageURL,
      message: body.message,
      repliedTo: null,
      isExclusive: body.isExclusive ?? null,
      price: price ?? null,
    } as WithId<GroupMessagesEntity>;

    const { insertedId } = await groupMessagesRepository.insertOne(replyMessage);
    Object.assign(replyMessage, { _id: insertedId });

    await groupMessagesRepository.updateOne({ _id: messageId }, { $set: { repliedTo: insertedId } });
    await groupRepliesRepository.insertOne({
      imageURL: body.imageURL,
      message: body.message,
      messageId: messageId,
      receiversId: receiversId,
      repliedAt: new Date(),
      replierId: senderId,
    });
    const repliedMessage = await groupMessagesRepository.findOne({ _id: messageId });
    io.to(receiversId.toString()).emit('groupReplyMessage', { ...replyMessage, repliedMessage });
    return res.json({ ...replyMessage, repliedMessage });
  }
};
