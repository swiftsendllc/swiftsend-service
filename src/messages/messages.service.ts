import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { io, onlineUsers } from '..';
import { GroupChannelsEntity } from '../entities/channel-groups.entity';
import { ChannelsEntity } from '../entities/channels.entity';
import { GroupMessagesEntity } from '../entities/group-messages.entity';
import { MessageReactionsEntity } from '../entities/message-reactions.entity';
import { MessagesEntity } from '../entities/messages.entity';
import { db } from '../rdb/mongodb';
import { Collections } from '../util/constants';
import { DeleteMessagesInput } from './dto/delete-messages.dto';
import { EditMessageInput } from './dto/edit-message.dto';
import { GroupChannelCreateInput } from './dto/group-channel-create.dto';
import { SendGroupMessageInput } from './dto/send-group-message.dto';
import { SendMessageReactionsInput } from './dto/send-message-reactions.dto';
import { MessageInput } from './dto/send-message.dto';

const messages = db.collection<MessagesEntity>(Collections.MESSAGES);
const channels = db.collection<ChannelsEntity>(Collections.CHANNELS);
const message_reactions = db.collection<MessageReactionsEntity>(Collections.MESSAGE_REACTIONS);
const groupChannels = db.collection<GroupChannelsEntity>(Collections.GROUP_CHANNELS);
const groupMessages = db.collection<GroupMessagesEntity>(Collections.GROUP_MESSAGES);

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
  const receiverId = new ObjectId(req.params.userId);

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
          from: Collections.MESSAGE_REACTIONS,
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
  } as WithId<MessageReactionsEntity>;

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

export const createGroupChannel = async (req: Request, res: Response) => {
  const senderId = new ObjectId(req.user!.userId);
  const body = req.body as GroupChannelCreateInput;
  const newGroupChannel: WithId<GroupChannelsEntity> = {
    _id: new ObjectId(),
    participants: [senderId],
    createdAt: new Date(),
    channelName: body.channelName,
    description: body.description,
    senderId: senderId,
  };

  await groupChannels.insertOne(newGroupChannel);
  return res.status(200).json(newGroupChannel);
};

export const addMemberToChannelGroup = async (req: Request, res: Response) => {
  const senderId = new ObjectId(req.user!.userId);
  console.log(req.params.receiversId);
  const receiversId = new ObjectId(req.params.receiversId);
  const channelId = new ObjectId(req.params.channelId);
  await groupChannels.updateOne(
    { _id: channelId, participants: senderId },
    { $addToSet: { participants: receiversId } },
  );
  return res.status(200).json({ message: 'OK' });
};

export const getGroupChannel = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const groupData = await groupChannels.find({ participants: { $in: [userId] } }).toArray();
  return res.status(200).json(groupData);
};

export const sendGroupMessage = async (req: Request, res: Response) => {
  const senderId = new ObjectId(req.user!.userId);
  const body = req.body as SendGroupMessageInput;
  const channelId = new ObjectId(req.params.channelId);
  const channel = await groupChannels.findOne({ _id: channelId });
  const receiversId = channel?.participants;
  if (receiversId)
    await groupMessages.insertOne({
      channelId: channelId,
      senderId: senderId,
      receiversId: receiversId,
      message: body.message,
      imageURL: body.imageURL ?? null,
      createdAt: new Date(),
      deletedAt: null,
      editedAt: null,
      deleted: false,
      edited: false,
    });
  return res.json({ message: 'OK' });
};

export const getChannelGroupMessages = async (req: Request, res: Response) => {
  if (!ObjectId.isValid(req.params.channelId)) {
    console.log('error');
    return res.status(404).json({ error: 'CHANNEL ID NOT FOUND!' });
  }
  const channelId = new ObjectId(req.params.channelId);
  const groupMessagesData = await groupMessages
    .aggregate([
      {
        $match: { channelId },
      },
      {
        $lookup: {
          from: Collections.GROUP_CHANNELS,
          localField: 'channelId',
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
    ])
    .toArray();

  return res.status(200).json(groupMessagesData);
};

export const deleteChannelGroupMessage = async (req: Request, res: Response) => {
  const senderId = new ObjectId(req.user!.userId);
  const messageId = new ObjectId(req.params.messageId);
  if(!messageId) {
    return res.status(404).json({error:"MESSAGE ID NOT FOUND!"})
  }
  await groupMessages.deleteOne({ _id: messageId, senderId: senderId });
  return res.status(200).json({message:"MESSAGE DELETED"})
};
