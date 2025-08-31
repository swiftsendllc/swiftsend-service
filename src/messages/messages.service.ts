import { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import { shake } from 'radash';
import { io, onlineUsers } from '..';
import { AssetsEntity } from '../entities/assets.entity';
import { ChannelsEntity } from '../entities/channels.entity';
import { MessagesEntity } from '../entities/messages.entity';
import { ReactionsEntity } from '../entities/reactions.entity';
import { Collections } from '../util/constants';
import {
  assetsRepository,
  channelsRepository,
  messageAssetsRepository,
  messageReactionsRepository,
  messagesRepository,
  repliesRepository,
  userProfilesRepository,
} from '../util/repositories';
import { DeleteMessagesInput } from './dto/delete-messages.dto';
import { EditMessageInput } from './dto/edit-message.dto';
import { SendBroadcastInput } from './dto/send-broadcast.dto';
import { SendMessageReactionsInput } from './dto/send-message-reactions.dto';
import { MessageInput } from './dto/send-message.dto';
import { SendReplyInput } from './dto/send-reply.dto';
import { UpdateChannelInput } from './dto/update-channel.dto';

const getOrCreateChannel = async (senderId: ObjectId, receiverId: ObjectId) => {
  const channel = await channelsRepository.findOne({ users: { $all: [senderId, receiverId] } });
  if (channel) return channel;

  const newChannel: WithId<ChannelsEntity> = {
    _id: new ObjectId(),
    users: [senderId, receiverId],
    backgroundImage: 'none',
    isMuted: false,
    isPinned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
  await channelsRepository.insertOne(newChannel);
  return newChannel;
};

export const createChannel = async (req: Request, res: Response): Promise<any> => {
  const senderId = new ObjectId(req.user!.userId);
  const receiverId = new ObjectId(req.params.receiverId);

  const channel = await getOrCreateChannel(senderId, receiverId);

  return res.json(channel);
};

export const updateChannel = async (req: Request, res: Response): Promise<any> => {
  const channelId = new ObjectId(req.params.channelId);
  const body = req.body as UpdateChannelInput;
  const updatedChannel = await channelsRepository.findOneAndUpdate(
    { _id: channelId },
    {
      $set: shake({
        backgroundImage: body.backgroundImage,
        isMuted: body.isMuted,
        isPinned: body.isPinned,
      }),
    },
    { returnDocument: 'after' },
  );

  return res.status(200).json(updatedChannel);
};

export const getChannels = async (req: Request, res: Response): Promise<any> => {
  const senderId = new ObjectId(req.user!.userId);
  const channelMessages = await channelsRepository
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
            { $match: { _id: { $ne: senderId } } },
            { $project: { userId: 1, username: 1, fullName: 1, avatarURL: 1 } },
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
          pipeline: [{ $sort: { createdAt: -1 } }, { $limit: 1 }, { $project: { message: 1 } }],
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
        lastSeen: receiverSocketData?.lastActive || channel.receiver.lastSeen || null,
      },
    };
  });
  return res.json(data);
};

export const getChannelById = async (req: Request, res: Response): Promise<any> => {
  const channelId = new ObjectId(req.params.channelId);
  const senderId = new ObjectId(req.user!.userId);
  const [singleChannel] = await channelsRepository
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
            { $match: { userId: { $ne: senderId } } },
            {
              $project: {
                username: 1,
                avatarURL: 1,
                userId: 1,
                lastSeen: 1,
                fullName: 1,
                region: 1,
                bannerURL: 1,
                createdAt: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: { path: '$receiver' },
      },
      {
        $lookup: {
          from: Collections.MESSAGES,
          localField: '_id',
          foreignField: 'channelId',
          as: 'lastMessage',
          pipeline: [{ $sort: { _id: -1 } }, { $limit: 1 }, { $project: { createdAt: 1, message: 1 } }],
        },
      },
      {
        $unwind: { path: '$lastMessage', preserveNullAndEmptyArrays: true },
      },
    ])
    .toArray();

  if (!singleChannel) return res.status(404).json({ message: 'Channel is not found!' });

  const receiverSocketData = onlineUsers.get(singleChannel.receiver.userId.toString());
  return res.json({
    ...singleChannel,
    receiver: {
      ...singleChannel.receiver,
      isOnline: !!receiverSocketData,
      lastSeen: receiverSocketData?.lastActive || singleChannel.receiver.lastSeen,
    },
  });
};

export const getChannelMessages = async (req: Request, res: Response): Promise<any> => {
  const channelId = new ObjectId(req.params.channelId);
  const userId = new ObjectId(req.user!.userId);
  const limit = parseInt(req.query.limit as string) || 25;
  const offset = parseInt(req.query.offset as string) || 0;

  const channelMessages = await messagesRepository
    .aggregate([
      {
        $match: { channelId },
      },
      {
        $lookup: {
          from: Collections.USER_PROFILES,
          localField: 'senderId',
          foreignField: 'userId',
          as: 'sender',
          pipeline: [{ $project: { userId: 1, fullName: 1, username: 1, avatarURL: 1, bannerURL: 1, region: 1 } }],
        },
      },
      {
        $unwind: {
          path: '$sender',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: Collections.MESSAGES,
          localField: '_id',
          foreignField: 'repliedTo',
          as: 'repliedToMessage',
          pipeline: [{ $project: { message: 1 } }],
        },
      },
      {
        $unwind: {
          path: '$repliedToMessage',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: Collections.REPLIES,
          localField: '_id',
          foreignField: 'messageId',
          as: 'replies',
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
        $lookup: {
          from: Collections.PURCHASES,
          localField: '_id',
          foreignField: 'contentId',
          as: '_purchased',
        },
      },
      {
        $lookup: {
          from: Collections.MESSAGE_ASSETS,
          localField: '_id',
          foreignField: 'messageId',
          as: '_message_assets',
        },
      },
      {
        $lookup: {
          from: Collections.ASSETS,
          localField: '_message_assets.assetId',
          foreignField: '_id',
          as: '_assets',
        },
      },
      {
        $set: {
          isUser: {
            $cond: [{ $eq: ['$senderId', userId] }, true, false],
          },
          isPurchased: {
            $cond: [{ $gt: [{ $size: '$_purchased' }, 0] }, true, false],
          },
          _assets: {
            $map: {
              input: '$_assets',
              as: 'asset',
              in: {
                _id: '$$asset._id',
                originalURL: {
                  $cond: [
                    {
                      $or: [
                        { $gt: [{ $size: '$_purchased' }, 0] },
                        { $eq: ['$senderId', userId] },
                        { $eq: ['$isExclusive', false] },
                      ],
                    },
                    '$$asset.originalURL',
                    '$$asset.blurredURL',
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _purchased: 0,
          _message_assets: 0,
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
// needs to be fixed for all media
export const getChannelMedia = async (req: Request, res: Response): Promise<any> => {
  const channelId = new ObjectId(req.params.channelId);
  const media = await messagesRepository
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

export const deleteMessages = async (req: Request, res: Response): Promise<any> => {
  const body = req.body as DeleteMessagesInput;
  const validMessageIds = body.messageIds.filter((id) => ObjectId.isValid(id));

  if (validMessageIds.length === 0) return res.status(400).json({ error: "MESSAGE IDS CAN'T BE EMPTY!" });

  const messageIds = validMessageIds.map((id: string) => new ObjectId(id));
  const userId = new ObjectId(req.user!.userId);
  console.log(messageIds);

  const result = await messagesRepository.findOneAndUpdate(
    { senderId: userId, _id: { $in: messageIds } },
    { $set: { deletedAt: new Date(), deleted: true, message: 'This message was deleted' } },
  );

  const message = await messagesRepository.findOne({ _id: { $in: messageIds } });
  if (message) {
    const receiverSocketId = message.receiverId.toString();
    io.to(receiverSocketId).emit('bulkDelete', {
      messageIds: messageIds,
      deleted: true,
      deletedAt: new Date(),
    });
  }
  return res.status(200).json(!!result);
};
export const deleteChannel = async (req: Request, res: Response): Promise<any> => {
  const channelId = new ObjectId(req.params.channelId);
  const senderId = new ObjectId(req.user!.userId);

  const channel = await channelsRepository.findOne({ _id: channelId, users: senderId });
  if (!channel) {
    return res.status(200).json({ message: "Channel not found or you don't have permission" });
  }
  await channelsRepository.deleteOne({ _id: channelId });
  return res.status(200).json({ message: 'Channel deleted successfully' });
};

export const sendMessage = async (req: Request, res: Response): Promise<any> => {
  const body = req.body as MessageInput;
  const userId = new ObjectId(req.user!.userId);
  const receiverId = new ObjectId(body.receiverId);
  const isExclusive = body.isExclusive;
  const assets = body.assetIds;

  if (!isExclusive && body.message?.trim() === '') return res.status(400).json("Messages can't be empty");
  if (isExclusive && !assets.length) return res.status(404).json("Assets can't be empty for exclusive messages!");
  if (!receiverId) return res.status(400).json({ message: 'RECEIVER ID NOT FOUND!' });

  const message = body.message?.trim();
  const assetIds = assets.map((id) => new ObjectId(id));
  const channel = await getOrCreateChannel(userId, receiverId);

  const newMessage = {
    channelId: channel._id,
    message,
    isExclusive: isExclusive,
    price: body.price,
    senderId: userId,
    receiverId,
    createdAt: new Date(),
    deletedAt: null,
    editedAt: null,
    deleted: false,
    edited: false,
    delivered: false,
    seen: false,
    repliedTo: null,
    purchasedBy: [userId],
  } as WithId<MessagesEntity>;

  const { insertedId } = await messagesRepository.insertOne(newMessage);
  Object.assign(newMessage, { _id: insertedId });

  await Promise.all(
    assets.map(async (assetId) => {
      await messageAssetsRepository.insertOne({
        assetId: new ObjectId(assetId),
        createdAt: new Date(),
        messageId: insertedId,
        updatedAt: new Date(),
        deletedAt: null,
      });
    }),
  );
  let messageAssets: AssetsEntity[] = [];

  const fetchedAssets = await assetsRepository.find({ _id: { $in: assetIds } }).toArray();
  if (isExclusive) {
    messageAssets = fetchedAssets.map((asset) => ({
      ...asset,
      originalURL: asset.blurredURL,
    }));
  }

  const senderProfile = await userProfilesRepository.findOne({ userId: userId });
  const receiverSocketId = receiverId.toString();
  io.to(receiverSocketId).emit('newMessage', { ...newMessage, sender: senderProfile, _assets: messageAssets });
  return res.json({ ...newMessage, sender: senderProfile, _assets: fetchedAssets });
};

export const broadcast = async (req: Request, res: Response): Promise<any> => {
  const userId = new ObjectId(req.user!.userId);
  const body = req.body as SendBroadcastInput;
  const receiversId = body.receiversId;
};

export const editMessage = async (req: Request, res: Response): Promise<any> => {
  const messageId = new ObjectId(req.params.messageId);
  const senderId = new ObjectId(req.user!.userId);
  const body = req.body as EditMessageInput;

  if (!body.message) return res.status(400).json("MESSAGE CAN'T BE EMPTY!");

  await messagesRepository.updateOne(
    { senderId, _id: messageId },
    { $set: { message: body.message, editedAt: new Date(), edited: true } },
  );

  const updatedMessage = await messagesRepository.findOne({ _id: messageId });
  if (updatedMessage) {
    const receiverSocketId = updatedMessage.receiverId.toString();
    io.to(receiverSocketId).emit('messageEdited', {
      messageId: messageId.toString(),
      message: body.message,
      editedAt: updatedMessage.editedAt?.toISOString(),
      edited: true,
    });
  }

  return res.json(updatedMessage);
};

export const forwardMessage = async (req: Request, res: Response): Promise<any> => {
  const messageId = new ObjectId(req.params.messageId);
  const senderId = new ObjectId(req.user!.userId);
  const receiverId = new ObjectId(req.params.receiverId);

  const forwardedMessage = await messagesRepository.findOne({ _id: messageId });
  if (!forwardedMessage) {
    return res.status(400).json({ message: 'Message not found!' });
  }
  const channel = await getOrCreateChannel(senderId, receiverId);
  await messagesRepository.insertOne({
    channelId: channel._id,
    message: forwardedMessage.message,
    isExclusive: forwardedMessage.isExclusive,
    price: forwardedMessage.price,
    senderId,
    receiverId,
    createdAt: new Date(),
    editedAt: new Date(),
    deletedAt: new Date(),
    deleted: false,
    edited: false,
    seen: false,
    delivered: false,
    repliedTo: null,
    purchasedBy: [forwardedMessage.senderId],
  });
  return res.json({ message: 'MESSAGE DELETED forwarded' });
};

export const deleteMessage = async (req: Request, res: Response): Promise<any> => {
  const messageId = new ObjectId(req.params.messageId);
  const userId = new ObjectId(req.user!.userId);
  const message = await messagesRepository.findOne({ _id: messageId });

  if (!message) return res.status(404).json({ message: 'NOT FOUND!' });

  if (!message.senderId.equals(userId)) return res.status(403).json({ message: 'Unauthorized!' });

  await messagesRepository.updateOne(
    { _id: messageId, senderId: userId },
    { $set: { deleted: true, deletedAt: new Date(), message: 'You deleted this message' } },
  );

  const deletedMessage = await messagesRepository.findOne({ _id: messageId });

  const receiverSocketId = message.receiverId.toString();
  io.to(receiverSocketId).emit('messageDeleted', {
    deleted: true,
    deletedAt: new Date().toISOString(),
    messageId: messageId.toString(),
    message: 'This message is deleted',
  });
  return res.status(200).json(deletedMessage);
};

export const sendMessageReactions = async (req: Request, res: Response): Promise<any> => {
  const body = req.body as SendMessageReactionsInput;
  const messageId = new ObjectId(body.messageId);
  const userId = new ObjectId(req.user!.userId);

  if (!messageId) {
    return res.status(400).json({ error: 'MESSAGE NOT FOUND!' });
  }

  const reaction = {
    userId: userId,
    messageId,
    reaction: body.reaction,
    createdAt: new Date(),
  } as WithId<ReactionsEntity>;
  const { insertedId } = await messageReactionsRepository.insertOne(reaction);
  Object.assign(reaction, { _id: insertedId });

  const message = await messagesRepository.findOne({ _id: messageId });
  if (message) {
    const receiverSocketId = message.senderId.toString();
    if (receiverSocketId) io.to(receiverSocketId).emit('messageReactions', reaction);
  }

  return res.status(200).json(reaction);
};

export const deleteMessageReactions = async (req: Request, res: Response): Promise<any> => {
  try {
    const reactionId = new ObjectId(req.params.reactionId);
    const userId = new ObjectId(req.user!.userId);
    const reaction = await messageReactionsRepository.findOne({ _id: reactionId });
    if (reaction) {
      const messageId = reaction.messageId;
      const message = await messagesRepository.findOne({ _id: messageId });
      if (message) {
        const receiverId = message.senderId.toString();
        if (receiverId)
          io.to(receiverId).emit('deletedReactions', {
            reactionId: reactionId,
            userId: userId,
          });
      }
    }

    await messageReactionsRepository.deleteOne({ _id: reactionId, userId: userId });
    return res.status(200).json({ message: 'OK' });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: 'INTERNAL SERVER ERROR!' });
  }
};

export const sendMessageReply = async (req: Request, res: Response): Promise<any> => {
  const senderId = new ObjectId(req.user!.userId);
  const body = req.body as SendReplyInput;

  const messageId = new ObjectId(body.messageId);
  const receiverId = new ObjectId(body.receiverId);
  const channel = await getOrCreateChannel(senderId, receiverId);

  const replyMessage = {
    channelId: channel._id,
    message: body.message,
    isExclusive: false,
    price: 0,
    senderId,
    receiverId,
    createdAt: new Date(),
    deletedAt: null,
    editedAt: null,
    deleted: false,
    edited: false,
    delivered: false,
    seen: false,
    repliedTo: null,
    purchasedBy: [senderId],
  } as WithId<MessagesEntity>;

  const { insertedId } = await messagesRepository.insertOne(replyMessage);
  Object.assign(replyMessage, { _id: insertedId });

  await repliesRepository.insertOne({
    replierId: senderId,
    message: body.message,
    messageId,
    receiverId,
    repliedAt: new Date(),
  });
  await messagesRepository.updateOne({ _id: messageId }, { $set: { repliedTo: insertedId } });
  const senderProfile = await userProfilesRepository.findOne({ userId: senderId });

  const repliedToMessage = await messagesRepository.findOne({ _id: messageId });
  io.to(receiverId.toString()).emit('replyMessage', { ...replyMessage, repliedToMessage, sender: senderProfile });

  return res.status(200).json({ ...replyMessage, repliedToMessage, sender: senderProfile });
};
