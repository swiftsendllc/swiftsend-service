import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { shake } from 'radash';
import { io, onlineUsers } from '..';
import { ChannelsEntity } from '../entities/channels.entity';
import { GroupMessagesEntity } from '../entities/group-messages.entity';
import { GroupReactionsEntity } from '../entities/group-reactions.entity';
import { GroupsEntity } from '../entities/groups.entity';
import { MessagesEntity } from '../entities/messages.entity';
import { ReactionsEntity } from '../entities/reactions.entity';
import { RepliesEntity } from '../entities/replies.entity';
import { UserProfilesEntity } from '../entities/user-profiles.entity';
import { db } from '../rdb/mongodb';
import { Collections } from '../util/constants';
import { DeleteMembersInput } from './dto/delete-members.dto';
import { DeleteMessagesInput } from './dto/delete-messages.dto';
import { EditGroupMessageInput } from './dto/edit-group-message.dto';
import { EditMessageInput } from './dto/edit-message.dto';
import { GroupCreateInput } from './dto/group-create.dto';
import { SendGroupMessageInput } from './dto/send-group-message.dto';
import { SendGroupReactionInput } from './dto/send-group-reaction.dto';
import { SendMessageReactionsInput } from './dto/send-message-reactions.dto';
import { MessageInput } from './dto/send-message.dto';
import { SendReplyInput } from './dto/send-reply.dto';
import { UpdateGroupInput } from './dto/update-group.dto';

const messages = db.collection<MessagesEntity>(Collections.MESSAGES);
const channels = db.collection<ChannelsEntity>(Collections.CHANNELS);
const user_profiles = db.collection<UserProfilesEntity>(Collections.USER_PROFILES);
const message_reactions = db.collection<ReactionsEntity>(Collections.REACTIONS);
const groups = db.collection<GroupsEntity>(Collections.GROUPS);
const groupMessages = db.collection<GroupMessagesEntity>(Collections.GROUP_MESSAGES);
const groupReactions = db.collection<GroupReactionsEntity>(Collections.GROUP_REACTIONS);
const replies = db.collection<RepliesEntity>(Collections.REPLIES);

const getOrCreateChannel = async (senderId: ObjectId, receiverId: ObjectId) => {
  const channel = await channels.findOne({ users: { $all: [senderId, receiverId] } });
  if (channel) return channel;

  const newChannel: WithId<ChannelsEntity> = {
    _id: new ObjectId(),
    users: [senderId, receiverId],
  };
  await channels.insertOne(newChannel);
  return newChannel;
};

export const createChannel = async (req: Request, res: Response) => {
  const senderId = new ObjectId(req.user!.userId);
  const receiverId = new ObjectId(req.params.receiverId);

  const channel = await getOrCreateChannel(senderId, receiverId);

  return res.json(channel);
};

export const getChannels = async (req: Request, res: Response) => {
  const senderId = new ObjectId(req.user!.userId);
  const channelMessages = await channels
    .aggregate([
      {
        $match: {
          users: senderId,
        },
      },
      {
        $lookup: {
          from: Collections.USER_PROFILES,
          localField: 'users',
          foreignField: 'userId',
          as: 'receiver',
          pipeline: [
            {
              $match: {
                _id: {
                  $ne: senderId,
                },
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$receiver',
        },
      },
      {
        $match: {
          'receiver.userId': {
            $ne: senderId,
          },
        },
      },
      {
        $lookup: {
          from: Collections.MESSAGES,
          localField: '_id',
          foreignField: 'channelId',
          as: 'lastMessage',
          pipeline: [
            {
              $sort: {
                createdAt: -1,
              },
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
        },
      },
      {
        $sort: {
          'lastMessage.createdAt': -1,
        },
      },
    ])
    .toArray();

  const data = channelMessages.map((channel) => {
    const receiverSocketData = onlineUsers.get(channel.receiver.userId.toString());
    return {
      ...channel,
      receiver: {
        ...channel.receiver,
        isOnline: !!receiverSocketData,
        lastSeen: receiverSocketData?.lastActive,
      },
    };
  });
  return res.json(data);
};

export const getChannelById = async (req: Request, res: Response) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ error: 'Channel not found!' });
  }
  const channelId = new ObjectId(req.params.id);
  const senderId = new ObjectId(req.user!.userId);
  const [singleChannel] = await channels
    .aggregate([
      {
        $match: {
          _id: channelId,
        },
      },
      {
        $lookup: {
          from: Collections.USER_PROFILES,
          localField: 'users',
          foreignField: 'userId',
          as: 'receiver',
          pipeline: [
            {
              $match: {
                userId: {
                  $ne: senderId,
                },
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$receiver',
        },
      },
      {
        $lookup: {
          from: Collections.MESSAGES,
          localField: '_id',
          foreignField: 'channelId',
          as: 'lastMessage',
          pipeline: [
            {
              $sort: {
                _id: -1,
              },
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

  if (!singleChannel) {
    return res.status(404).json({ message: 'Channel is not found!' });
  }

  const receiverSocketData = onlineUsers.get(singleChannel.receiver.userId.toString());
  return res.json({
    ...singleChannel,
    receiver: {
      ...singleChannel.receiver,
      isOnline: !!receiverSocketData,
      lastSeen: receiverSocketData?.lastActive,
    },
  });
};

export const getChannelMessages = async (req: Request, res: Response) => {
  if (!ObjectId.isValid(req.params.channelId)) {
    return res.status(404).json({ error: 'The channel is not found!' });
  }
  const channelId = new ObjectId(req.params.channelId);

  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const channelMessages = await messages
    .aggregate([
      {
        $match: {
          channelId,
        },
      },
      {
        $lookup: {
          from: Collections.USER_PROFILES,
          localField: 'receiverId',
          foreignField: 'userId',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
        },
      },
      {
        $lookup: {
          from: Collections.REACTIONS,
          localField: '_id',
          foreignField: 'messageId',
          as: 'reactions',
          pipeline: [{ $sort: { createdAt: -1 } }, { $limit: 1 }],
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
  return res.json(channelMessages);
};

export const getChannelMedia = async (req: Request, res: Response) => {
  const channelId = new ObjectId(req.params.channelId);
  const media = await messages
    .aggregate([
      {
        $match: { channelId, imageURL: { $ne: null } },
      },

      {
        $project: { imageURL: 1 },
      },
    ])
    .toArray();

  return res.status(200).json(media);
};

export const deleteMessages = async (req: Request, res: Response) => {
  try {
    const body = req.body as DeleteMessagesInput;
    const validMessageIds = body.messageIds.filter((id) => ObjectId.isValid(id));

    if (validMessageIds.length === 0) {
      return res.status(400).json({ error: "MESSAGE IDS CAN'T BE EMPTY!" });
    }

    const messageIds = validMessageIds.map((id: string) => new ObjectId(id));
    const userId = new ObjectId(req.user!.userId);
    console.log(messageIds);

    const result = await messages.updateMany(
      { senderId: userId, _id: { $in: messageIds } },
      { $set: { deletedAt: new Date(), deleted: true } },
    );

    if (result.matchedCount === 0) {
      return res.status(200).json({ error: 'NO MESSAGES FOUND TO DELETE!' });
    }
    if (result.modifiedCount > 0) {
      const message = await messages.findOne({ _id: { $in: messageIds } });
      if (message) {
        const receiverSocketId = message.receiverId.toString();
        io.to(receiverSocketId).emit('bulkDelete', {
          messageIds: messageIds,
          deleted: true,
          deletedAt: new Date(),
        });
      }
    }

    const deletedResult = await messages.deleteMany({ senderId: userId, _id: { $in: messageIds } });
    if (deletedResult.deletedCount === 0) {
      return res.status(404).json({ error: 'NO MESSAGES FOUND TO DELETE PERMANENTLY' });
    }

    return res.json({ message: 'MESSAGES DELETED SUCCESSFULLY' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'INTERNAL SERVER ERROR' });
  }
};

export const deleteChannel = async (req: Request, res: Response) => {
  const channelId = new ObjectId(req.params.id);
  const senderId = new ObjectId(req.user!.userId);

  const channel = await channels.findOne({ _id: channelId, users: senderId });
  if (!channel) {
    return res.status(200).json({ message: "Channel not found or you don't have permission" });
  }
  await channels.deleteOne({ _id: channelId });
  return res.status(200).json({ message: 'Channel deleted successfully' });
};

export const sendMessage = async (req: Request, res: Response) => {
  const body = req.body as MessageInput;
  const senderId = new ObjectId(req.user!.userId);
  const receiverId = new ObjectId(body.receiverId);
  if (senderId.toString() === receiverId.toString()) {
    return res.status(400).json({ message: "YOU CAN'T MESSAGE YOURSELF!" });
  }
  if (!receiverId) {
    return res.status(400).json({ message: 'RECEIVER ID NOT FOUND!' });
  }

  const channel = await getOrCreateChannel(senderId, receiverId);

  const { insertedId } = await messages.insertOne({
    channelId: channel._id,
    message: body.message,
    imageURL: body.imageURL ?? null,
    senderId,
    receiverId,
    createdAt: new Date(),
    deletedAt: null,
    editedAt: null,
    deleted: false,
    edited: false,
    delivered: false,
    seen: false,
    replied: false,
  });

  const newMessage = {
    channelId: channel._id,
    message: body.message,
    imageURL: body.imageURL ?? null,
    senderId,
    receiverId,
    createdAt: new Date(),
    deletedAt: null,
    editedAt: null,
    deleted: false,
    edited: false,
    delivered: false,
    seen: false,
    _id: insertedId,
  } as WithId<MessagesEntity>;

  const receiverSocketId = receiverId.toString();
  console.log(receiverSocketId);
  const receiverRoom = io.sockets.adapter.rooms.get(receiverSocketId);
  const isReceiverOnline = receiverRoom && receiverRoom.size > 0;

  if (isReceiverOnline) {
    await messages.updateOne({ _id: insertedId }, { $set: { seen: true } });
    io.to(receiverSocketId).emit('newMessage', newMessage);
  } else {
    await messages.updateOne({ _id: insertedId }, { $set: { delivered: true } });
    io.to(receiverSocketId).emit('newMessage', newMessage);
  }
  return res.json(newMessage);
};

export const editMessage = async (req: Request, res: Response) => {
  const messageId = new ObjectId(req.params.id);
  const senderId = new ObjectId(req.user!.userId);
  const body = req.body as EditMessageInput;

  const result = await messages.updateOne(
    { senderId, _id: messageId },
    { $set: { message: body.message, editedAt: new Date(), edited: true } },
  );

  if (result.modifiedCount > 0) {
    const updatedMessage = await messages.findOne({ _id: messageId });
    if (updatedMessage) {
      const receiverSocketId = updatedMessage.receiverId.toString();
      io.to(receiverSocketId).emit('messageEdited', {
        messageId: messageId.toString(),
        message: body.message,
        editedAt: updatedMessage.editedAt?.toISOString(),
        edited: true,
      });
    }
  }
  return res.json(result);
};

export const forwardMessage = async (req: Request, res: Response) => {
  const messageId = new ObjectId(req.params.id);
  const senderId = new ObjectId(req.user!.userId);
  const receiverId = new ObjectId(req.params.receiverId);

  const forwardedMessage = await messages.findOne({ _id: messageId });
  if (!forwardedMessage) {
    return res.status(400).json({ message: 'Message not found!' });
  }
  const channel = await getOrCreateChannel(senderId, receiverId);
  await messages.insertOne({
    channelId: channel._id,
    message: forwardedMessage.message,
    imageURL: forwardedMessage.imageURL ?? null,
    senderId,
    receiverId,
    createdAt: new Date(),
    editedAt: new Date(),
    deletedAt: new Date(),
    deleted: false,
    edited: false,
    seen: false,
    delivered: false,
    replied: false,
  });
  return res.json({ message: 'MESSAGE DELETED forwarded' });
};

export const deleteMessage = async (req: Request, res: Response) => {
  const messageId = new ObjectId(req.params.id);
  const userId = new ObjectId(req.user!.userId);
  const message = await messages.findOne({ _id: messageId });
  if (!message) {
    return res.status(404).json({ error: 'MESSAGE NOT FOUND!' });
  }
  if (message.senderId.toString() !== userId.toString()) {
    return res.status(403).json({ error: 'NOT AUTHORIZED TO DELETE THE MESSAGE!' });
  }
  const result = await messages.updateOne(
    { _id: messageId, senderId: userId },
    { $set: { deleted: true, deletedAt: new Date(), message: '', imageURL: '' } },
  );
  await messages.deleteOne({ senderId: userId, _id: messageId });
  if (result.modifiedCount > 0) {
    const receiverSocketId = message.receiverId.toString();
    io.to(receiverSocketId).emit('messageDeleted', {
      deleted: true,
      deletedAt: new Date().toISOString(),
      messageId: messageId.toString(),
      imageURL: '',
      message: '',
    });
    return res.status(200).json({ message: 'Message deleted successfully' });
  } else {
    return res.status(500).json({ error: 'Failed to delete message!' });
  }
};

export const sendMessageReactions = async (req: Request, res: Response) => {
  const body = req.body as SendMessageReactionsInput;
  const messageId = new ObjectId(body.messageId);
  const userId = new ObjectId(req.user!.userId);

  if (!messageId) {
    return res.status(400).json({ error: 'MESSAGE NOT FOUND!' });
  }

  const { insertedId } = await message_reactions.insertOne({
    userId: userId,
    messageId,
    reaction: body.reaction,
    createdAt: new Date(),
  });

  const reaction = {
    userId: userId,
    messageId,
    reaction: body.reaction,
    createdAt: new Date(),
    _id: insertedId,
  } as WithId<ReactionsEntity>;

  const message = await messages.findOne({ _id: messageId });
  if (message) {
    const receiverSocketId = message.senderId.toString();
    if (receiverSocketId) io.to(receiverSocketId).emit('messageReactions', reaction);
  }

  return res.status(200).json(reaction);
};

export const deleteMessageReactions = async (req: Request, res: Response) => {
  try {
    const reactionId = new ObjectId(req.params.reactionId);
    const userId = new ObjectId(req.user!.userId);
    const reaction = await message_reactions.findOne({ _id: reactionId });
    if (reaction) {
      const messageId = reaction.messageId;
      const message = await messages.findOne({ _id: messageId });
      if (message) {
        const receiverId = message.senderId.toString();
        if (receiverId)
          io.to(receiverId).emit('deletedReactions', {
            reactionId: reactionId,
            userId: userId,
          });
      }
    }

    await message_reactions.deleteOne({ _id: reactionId, userId: userId });
    return res.status(200).json({ message: 'OK' });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: 'INTERNAL SERVER ERROR!' });
  }
};

export const createGroup = async (req: Request, res: Response) => {
  const senderId = new ObjectId(req.user!.userId);
  const body = req.body as GroupCreateInput;
  const newGroup: WithId<GroupsEntity> = {
    _id: new ObjectId(),
    participants: [senderId],
    createdAt: new Date(),
    groupName: body.groupName,
    description: body.description,
    groupAvatar: body.groupAvatar || null,
    admin: senderId,
    moderators: [],
  };

  await groups.insertOne(newGroup);
  return res.status(200).json(newGroup);
};

export const updateGroup = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const body = req.body as UpdateGroupInput;
  console.log(req.params.groupId);
  const groupId = new ObjectId(req.params.groupId);

  const group = await groups.findOneAndUpdate(
    { _id: groupId, admin: userId },
    {
      $set: shake({
        groupName: body.groupName,
        groupAvatar: body.groupAvatar,
        description: body.description,
      }),
    },
    { returnDocument: 'after' },
  );
  const result = { ...group };
  return res.status(200).json(result);
};

export const deleteGroup = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const groupId = new ObjectId(req.params.groupId);
  await groups.deleteOne({ _id: groupId, admin: userId });
  return res.status(200).json({ message: 'OK' });
};

export const addMemberToGroup = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  console.log(req.params.receiversId);
  const memberId = new ObjectId(req.params.memberId);
  const groupId = new ObjectId(req.params.groupId);
  const group = await groups.findOne({ _id: groupId });

  if (!group) return res.status(404).json({ message: 'GROUP NOT FOUND!' });
  const members = await groups.findOne({ _id: groupId, participants: memberId });

  if (members) {
    return res.status(400).json({ message: 'USER ALREADY EXISTS IN THE GROUP!' });
  } else {
    const newMember = await groups.findOneAndUpdate(
      { _id: groupId, participants: userId },
      { $addToSet: { participants: memberId } },
      { returnDocument: 'after' },
    );

    return res.status(200).json(newMember);
  }
};

export const updateMemberToModerator = async (req: Request, res: Response) => {
  if (!ObjectId.isValid(req.params.memberId && req.params.channelId)) {
    return res.status(400).json({ message: 'OBJECT ID IS NOT VALID!' });
  }
  const userId = new ObjectId(req.user!.userId);
  const groupId = new ObjectId(req.params.groupId);
  const group = await groups.findOne({ _id: groupId });
  const memberId = new ObjectId(req.params.memberId);
  if (!group) return res.status(404).json({ message: 'GROUP NOT FOUND!' });

  if (group) {
    const members = await groups.findOne({ participants: memberId });
    const moderators = await groups.findOne({ moderators: memberId });

    if (moderators) return res.status(400).json({ message: "ALREADY IN YOUR MODERATOR\'S LIST" });

    if (members) {
      const newModerator = await groups.findOneAndUpdate(
        { _id: groupId, admin: userId },
        { $addToSet: { moderators: memberId } },
        { returnDocument: 'after' },
      );
      return res.status(200).json(newModerator);
    } else {
      return res.status(200).json({ message: "THE USER IS NOT IN YOUR PARTICIPANT'S LIST!" });
    }
  }
};

export const getGroups = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const groupData = await groups
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
  const channel = await groups.findOne({ _id: groupId });
  const receiversId = channel?.participants;
  if (receiversId) {
    const { insertedId } = await groupMessages.insertOne({
      groupId: groupId,
      senderId: senderId,
      receiversId: receiversId,
      message: body.message ?? null,
      imageURL: body.imageURL ?? null,
      createdAt: new Date(),
      deletedAt: null,
      editedAt: null,
      deleted: false,
      edited: false,
      replied: false,
    });
    const groupMessage: WithId<GroupMessagesEntity> = {
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
      replied: false,
      _id: insertedId,
    };
    const sender = await user_profiles.findOne({ userId: senderId });
    const receiverSocketId = channel.participants || [];
    const receivers = receiverSocketId.map((id) => id.toString()) as [];
    io.to(receivers).emit('groupMessage', { ...groupMessage, sender });
    return res.json({ ...groupMessage, sender });
  }
};

export const getGroupMessages = async (req: Request, res: Response) => {
  if (!ObjectId.isValid(req.params.groupId)) {
    console.log('error');
    return res.status(404).json({ error: 'INVALID ID!' });
  }
  const groupId = new ObjectId(req.params.groupId);
  const groupMessagesData = await groupMessages
    .aggregate([
      {
        $match: { groupId },
      },
      {
        $lookup: {
          from: Collections.GROUPS,
          localField: 'groupId',
          foreignField: '_id',
          as: 'channel',
        },
      },
      {
        $unwind: {
          path: '$channel',
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
    ])
    .toArray();

  return res.status(200).json(groupMessagesData);
};

export const getGroupById = async (req: Request, res: Response) => {
  if (!ObjectId.isValid(req.params.groupId)) {
    return res.status(200).json({ message: 'INVALID ID!' });
  }
  const groupId = new ObjectId(req.params.groupId);
  const [group] = await groups
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
    ])
    .toArray();
  return res.status(200).json(group);
};

export const editGroupMessage = async (req: Request, res: Response) => {
  if (!ObjectId.isValid(req.params.messageId)) {
    return res.status(400).json({ message: 'INVALID ID!' });
  }
  const senderId = new ObjectId(req.user!.userId);
  const messageId = new ObjectId(req.params.messageId);
  const body = req.body as EditGroupMessageInput;
  if (!body) {
    return res.status(400).json({ message: 'BODY NOT FOUND!' });
  }
  const result = await groupMessages.updateOne(
    { _id: messageId, senderId: senderId },
    { $set: { message: body.message, imageURL: body.imageURL, edited: true, editedAt: new Date() } },
  );
  if (result.modifiedCount > 0) {
    const updateGroupMessage = await groupMessages.findOne({ _id: messageId });
    const receiverSocketId: ObjectId[] = updateGroupMessage?.receiversId || [];
    const receivers = receiverSocketId.map((id) => id.toString()) as [];
    io.to(receivers).emit('group_message_edited', {
      _id: messageId,
      message: body.message,
      imageURL: body.imageURL,
      edited: true,
      editedAt: new Date(),
    });
  }
  return res.json(result);
};

export const deleteGroupMessage = async (req: Request, res: Response) => {
  if (!ObjectId.isValid(req.params.messageId)) {
    return res.status(404).json({ error: 'MESSAGE ID NOT FOUND!' });
  }
  const senderId = new ObjectId(req.user!.userId);
  const messageId = new ObjectId(req.params.messageId);
  const messages = await groupMessages.findOne({ _id: messageId });
  const result = await groupMessages.updateOne(
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
  await groupMessages.deleteOne({ _id: messageId, senderId: senderId });
  return res.status(200).json({ message: 'MESSAGE DELETED' });
};

export const kickMemberFromGroup = async (req: Request, res: Response) => {
  if (!ObjectId.isValid(req.params.memberId)) {
    return res.status(404).json({ message: 'ID NOT FOUND!' });
  }
  const userId = new ObjectId(req.user!.userId);
  const groupId = new ObjectId(req.params.groupId);
  const memberId = new ObjectId(req.params.memberId);
  const group = await groups.findOne({ _id: groupId });
  if (!group) {
    return res.status(404).json({ message: 'GROUP NOT FOUND!❌' });
  }

  const moderators = await groups.findOne({ _id: groupId, moderators: { $in: [memberId] } });
  if (moderators) {
    const updatedMembers = await groups.findOneAndUpdate(
      { _id: groupId, admin: userId },
      { $pull: { participants: memberId, moderators: memberId } },
      { returnDocument: 'after' },
    );
    return res.status(200).json(updatedMembers);
  } else {
    const updatedParticipants = await groups.findOneAndUpdate(
      { _id: groupId, admin: userId },
      { $pull: { participants: memberId, moderators: memberId } },
      { returnDocument: 'after' },
    );
    return res.status(200).json(updatedParticipants);
  }
};

export const kickGroupMembers = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const body = req.body as DeleteMembersInput;
  const groupId = new ObjectId(req.params.groupId);

  const membersId = body.membersId.map((id) => new ObjectId(id));
  console.log('hdhhdh', membersId);
  const moderators = await groups.findOne({ _id: groupId, moderators: { $in: membersId } });
  if (moderators) {
    console.log('ff');
    await groups.updateMany(
      { _id: groupId, admin: userId },
      // @ts-expect-error
      { $pull: { participants: { $in: membersId }, moderators: { $in: membersId } } },
      { returnDocument: 'after' },
    );

    return res.status(200).json({ message: 'KICKED IN THE ASS 🍑' });
  } else {
    const kickedParticipants = await groups.findOneAndUpdate(
      { _id: groupId, admin: userId },
      // @ts-expect-error
      { $pull: { participants: { $in: membersId } } },
      { returnDocument: 'after' },
    );
    return res.status(200).json(kickedParticipants);
  }
};

export const demoteModeratorToMember = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const moderatorId = new ObjectId(req.params.moderatorId);
  const groupId = new ObjectId(req.params.groupId);
  const demoteModerator = await groups.findOneAndUpdate(
    { _id: groupId, admin: userId },
    { $pull: { moderators: moderatorId } },
    { returnDocument: 'after' },
  );
  return res.status(200).json(demoteModerator);
};

export const getGroupMedia = async (req: Request, res: Response) => {
  if (!ObjectId.isValid(req.params.groupId)) {
    return res.status(200).json({ message: 'INVALID ID ❌' });
  }
  const groupId = new ObjectId(req.params.groupId);
  const userId = new ObjectId(req.user!.userId);
  const groupMedia = await groupMessages
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
  const { insertedId } = await groupReactions.insertOne({
    messageId: body.messageId,
    reaction: body.reaction,
    reacted: true,
    createdAt: new Date(),
    senderId: userId,
  });
  const insertedReaction: WithId<GroupReactionsEntity> = {
    messageId: body.messageId,
    reaction: body.reaction,
    reacted: true,
    createdAt: new Date(),
    senderId: userId,
    _id: insertedId,
  };
  return res.status(200).json(insertedReaction);
};

export const deleteGroupReaction = async (req: Request, res: Response) => {
  const reactionId = new ObjectId(req.params.reactionId);
  const userId = new ObjectId(req.user!.userId);
  await groupReactions.deleteOne({ _id: reactionId, senderId: userId });
  return res.json({ message: 'REACTION IS DELETED 🚮' });
};

export const reply = async ($input: {
  userId: ObjectId;
  body: SendReplyInput;
  type: 'posts' | 'messages' | 'stories' | 'reels' | 'groups';
}) => {
  const newReply: WithId<RepliesEntity> = {
    _id: new ObjectId(),
    replierId: $input.userId,
    content: $input.body.content,
    contentId: $input.body.contentId,
    type: $input.type,
    repliedAt: new Date(),
  };
  await replies.insertOne(newReply);
  return newReply;
};

export const sendMessageReply = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const body = req.body as SendReplyInput;
  const messageId = new ObjectId(body.contentId);

  const sendReply = await reply({ userId, body, type: 'messages' });
  await messages.updateOne({ _id: messageId }, { $set: { replied: true } });

  return res.status(200).json(sendReply);
};

export const sendGroupMessageReply = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const body = req.body as SendReplyInput;
  const groupMessageId = new ObjectId(body.contentId);

  const sendReply = await reply({ userId, body, type: 'groups' });
  await groupMessages.updateOne({ _id: groupMessageId }, { $set: { replied: true } });

  return res.status(200).json(sendReply);
};
