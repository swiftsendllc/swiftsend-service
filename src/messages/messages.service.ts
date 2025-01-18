import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { io, onlineUsers } from '..';
import { ChannelsEntity } from '../entities/channels.entity';
import { MessagesEntity } from '../entities/messages.entity';
import { db } from '../rdb/mongodb';
import { Collections } from '../util/constants';
import { DeleteMessageInput } from './dto/delete-message.dto';
import { EditMessageInput } from './dto/edit-message.dto';
import { MessageInput } from './dto/send-message.dto';

const messages = db.collection<MessagesEntity>(Collections.MESSAGES);
const channels = db.collection<ChannelsEntity>(Collections.CHANNELS);

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
  const messageChannels = await channels
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
        },
      },

      {
        $match: {
          'receiver.userId': { $ne: senderId },
        },
      },
    ])
    .toArray();

  return res.json(messageChannels);
};

export const getChannelById = async (req: Request, res: Response) => {
  const channelId = new ObjectId(req.params.id);
  const senderId = new ObjectId(req.user!.userId);

  const [channel] = await channels
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

  if (!channel) {
    return res.status(404).json({ message: 'NotFound' });
  }

  return res.json(channel);
};

export const getChannelMessages = async (req: Request, res: Response) => {
  const channelId = new ObjectId(req.params.channelId);
  const userId = new ObjectId(req.user!.userId);
  const channelMessages = await messages
    .aggregate([
      {
        $match: {
          channelId,
          deletedBy: { $ne: userId }, //Excludes messages for the current user
        },
      },
      {
        $lookup: {
          from: Collections.USER_PROFILES,
          localField: 'receiverId',
          foreignField: 'userId',
          as: 'receiver',
        },
      },
      {
        $unwind: {
          path: '$receiver',
        },
      },
    ])
    .toArray();

  return res.json(channelMessages);
};

export const deleteChannelMessages = async (req: Request, res: Response) => {
  const channelId = new ObjectId(req.params.channelId);
  const senderId = new ObjectId(req.user!.userId);
  await messages.updateMany(
    { senderId, channelId },
    { $addToSet: { deletedBy: senderId } }, // Adds senderId to the deletedBy if not already present
  );
  return res.json({ message: 'ok' });
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
    return res.status(400).json({ message: "You can't message yourself" });
  }
  if (!receiverId) {
    return res.status(400).json({ message: 'There is no receiverId' });
  }

  const channel = await getOrCreateChannel(senderId, receiverId);

  await messages.insertOne({
    channelId: channel._id,
    message: body.message,
    imageURL: body.imageURL ?? null,
    senderId,
    receiverId,
    createdAt: new Date(),
    deletedAt: null,
    editedAt: null,
    deletedBy: [],
    deleted: false,
    edited: false,
  });

  const receiverSocketId = onlineUsers.get(receiverId.toString());
  if (receiverSocketId) {
    io.to(receiverSocketId).emit('newMessage', {
      channelId: channel._id.toString(),
      senderId: senderId.toString(),
      receiverId: receiverId.toString(),
      message: body.message,
      createdAt: new Date().toISOString(),
      imageURL: body.imageURL ?? null,
      deletedAt: null,
      deletedBy: [],
      deleted: false,
      edited: false,
    });
    io.to(receiverSocketId).emit('onlineUsers', Array.from(onlineUsers.keys()));
  }

  return res.json({ message: 'ok' });
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
      const receiverSocketId = onlineUsers.get(updatedMessage.receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('messageEdited', {
          messageId: messageId.toString(),
          message: body.message,
          editedAt: updatedMessage.editedAt?.toISOString(),
          edited: true
        });
      }
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
    deletedBy: [],
    deleted: false,
    edited: false,
  });
  return res.json({ message: 'Message successfully forwarded' });
};

export const deleteMessage = async (req: Request, res: Response) => {
  const messageId = new ObjectId(req.params.id);
  const senderId = new ObjectId(req.user!.userId);
  const body = req.body as DeleteMessageInput;
  const ifDeleted = body.deleted;
  if (ifDeleted) {
    await messages.updateOne({ senderId, _id: messageId }, { $set: { deleted: true, deletedAt: new Date() } });
  } else {
    await messages.updateOne({ senderId, _id: messageId }, { $addToSet: { deletedBy: senderId } });
  }
  return res.json({ message: ' ok' });
};
