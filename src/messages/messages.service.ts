import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { ChannelsEntity } from '../entities/channels.entity';
import { MessagesEntity } from '../entities/messages.entity';
import { db } from '../rdb/mongodb';
import { Collections } from '../util/constants';
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
            // { $project: { fullName: 1, avatarURL: 1 } },
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
            // { $project: { message: 1, createdAt: 1, senderId: 1 } },
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
    ])
    .toArray();

  if (!channel) {
    return res.status(404).json({ message: 'NotFound' });
  }

  return res.json(channel);
};

export const getChannelMessages = async (req: Request, res: Response) => {
  const channelId = new ObjectId(req.params.channelId);
  const channelMessages = await messages
    .aggregate([
      {
        $match: { channelId },
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

export const sendMessage = async (req: Request, res: Response) => {
  const body = req.body as MessageInput;

  const senderId = new ObjectId(req.user!.userId);
  const receiverId = new ObjectId(body.receiverId);

  const channel = await getOrCreateChannel(senderId, receiverId);

  await messages.insertOne({
    channelId: channel._id,
    message: body.message,
    imageURL: body.imageURL ?? null,
    senderId,
    receiverId,
    createdAt: new Date(),
  });
  return res.json({ message: 'ok' });
};

export const editMessage = async (req: Request, res: Response) => {
  const messageId = new ObjectId(req.params.id);
  const senderId = new ObjectId(req.user!.userId);
  const body = req.body as EditMessageInput;
  await messages.updateOne({ senderId, _id: messageId }, { $set: { message: body.message }, updatedAt: new Date() });
  return res.json({ message: ' ok' });
};

export const deleteMessage = async (req: Request, res: Response) => {
  const messageId = new ObjectId(req.params.id);
  const senderId = new ObjectId(req.user!.userId);
  await messages.deleteOne({ senderId, _id: messageId });
  return res.json({ message: ' ok' });
};
