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
import { UserProfilesEntity } from '../entities/user-profiles.entity';
import { Collections } from '../util/constants';
import {
  assetsRepository,
  channelsRepository,
  groupMessagesRepository,
  groupReactionsRepository,
  groupRepliesRepository,
  groupsRepository,
  messageAssetsRepository,
  messageReactionsRepository,
  messagesRepository,
  repliesRepository,
  userProfilesRepository,
} from '../util/repositories';
import { DeleteMembersInput } from './dto/delete-members.dto';
import { DeleteMessagesInput } from './dto/delete-messages.dto';
import { EditGroupMessageInput } from './dto/edit-group-message.dto';
import { EditMessageInput } from './dto/edit-message.dto';
import { GroupCreateInput } from './dto/group-create.dto';
import { SendBroadcastInput } from './dto/send-broadcast.dto';
import { SendGroupMessageInput } from './dto/send-group-message.dto';
import { SendGroupReactionInput } from './dto/send-group-reaction.dto';
import { SendGroupMessageReplyInput } from './dto/send-group-reply.dto';
import { SendMessageReactionsInput } from './dto/send-message-reactions.dto';
import { MessageInput } from './dto/send-message.dto';
import { SendReplyInput } from './dto/send-reply.dto';
import { UpdateGroupInput } from './dto/update-group.dto';

const getOrCreateChannel = async (senderId: ObjectId, receiverId: ObjectId) => {
  const channel = await channelsRepository.findOne({ users: { $all: [senderId, receiverId] } });
  if (channel) return channel;

  const newChannel: WithId<ChannelsEntity> = {
    _id: new ObjectId(),
    users: [senderId, receiverId],
  };
  await channelsRepository.insertOne(newChannel);
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
        $lookup: {
          from: Collections.PURCHASES,
          localField: 'lastMessage._id',
          foreignField: 'contentId',
          as: '_purchased',
        },
      },
      {
        $set: {
          isPurchased: {
            $cond: [{ $gt: [{ $size: '$_purchased' }, 0] }, true, false],
          },
        },
      },
      {
        $project: {
          _purchased: 0,
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

export const getChannelById = async (req: Request, res: Response) => {
  if (!ObjectId.isValid(req.params.channelId)) return res.status(404).json({ error: 'Channel not found!' });

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
      {
        $lookup: {
          from: Collections.REPLIES,
          localField: '_id',
          foreignField: 'messageId',
          as: 'reply',
        },
      },
      {
        $lookup: {
          from: Collections.PURCHASES,
          localField: 'lastMessage._id',
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
            $cond: [{ $eq: ['$senderId', senderId] }, true, false],
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
                        { $eq: ['$senderId', senderId] },
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
      lastSeen: receiverSocketData?.lastActive || singleChannel.receiver.lastSeen,
    },
  });
};

export const getChannelMessages = async (req: Request, res: Response) => {
  if (!ObjectId.isValid(req.params.channelId)) return res.status(404).json({ error: 'The channel is not found!' });

  const channelId = new ObjectId(req.params.channelId);
  const userId = new ObjectId(req.user!.userId);
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const channelMessages = await messagesRepository
    .aggregate([
      {
        $match: {
          channelId,
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
export const getChannelMedia = async (req: Request, res: Response) => {
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

    const result = await messagesRepository.updateMany(
      { senderId: userId, _id: { $in: messageIds } },
      { $set: { deletedAt: new Date(), deleted: true } },
    );

    if (result.matchedCount === 0) {
      return res.status(200).json({ error: 'NO MESSAGES FOUND TO DELETE!' });
    }
    if (result.modifiedCount > 0) {
      const message = await messagesRepository.findOne({ _id: { $in: messageIds } });
      if (message) {
        const receiverSocketId = message.receiverId.toString();
        io.to(receiverSocketId).emit('bulkDelete', {
          messageIds: messageIds,
          deleted: true,
          deletedAt: new Date(),
        });
      }
    }

    const deletedResult = await messagesRepository.deleteMany({ senderId: userId, _id: { $in: messageIds } });
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

  const channel = await channelsRepository.findOne({ _id: channelId, users: senderId });
  if (!channel) {
    return res.status(200).json({ message: "Channel not found or you don't have permission" });
  }
  await channelsRepository.deleteOne({ _id: channelId });
  return res.status(200).json({ message: 'Channel deleted successfully' });
};

export const sendMessage = async (req: Request, res: Response) => {
  const body = req.body as MessageInput;
  const userId = new ObjectId(req.user!.userId);
  const receiverId = new ObjectId(body.receiverId);
  const isExclusive = body.isExclusive;
  const assets = body.assetIds;

  if (!isExclusive && body.message?.trim() === '') return res.status(400).json('Empty message!');
  if (isExclusive && !assets.length) return res.status(404).json('Invalid request!');
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

  const isMessagePurchased = await messagesRepository.findOne({ _id: insertedId, purchasedBy: { $in: [userId] } });

  const messageAssets = isExclusive
    ? await assetsRepository
        .aggregate([
          {
            $match: { _id: { $in: assetIds } },
          },
          {
            $set: {
              originalURL: {
                $cond: [isMessagePurchased, '$originalURL', '$blurredURL'],
              },
            },
          },
        ])
        .toArray()
    : [];

  const senderProfile = await userProfilesRepository.findOne({ userId: userId });
  const receiverSocketId = receiverId.toString();
  io.to(receiverSocketId).emit('newMessage', { ...newMessage, sender: senderProfile, _assets: messageAssets });
  return res.json({ ...newMessage, sender: senderProfile, _assets: messageAssets });
};

export const broadcast = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const body = req.body as SendBroadcastInput;
  const receiversId = body.receiversId;
};

export const editMessage = async (req: Request, res: Response) => {
  const messageId = new ObjectId(req.params.id);
  const senderId = new ObjectId(req.user!.userId);
  const body = req.body as EditMessageInput;

  const result = await messagesRepository.updateOne(
    { senderId, _id: messageId },
    { $set: { message: body.message, editedAt: new Date(), edited: true } },
  );

  if (result.modifiedCount > 0) {
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
  }
  return res.json(result);
};

export const forwardMessage = async (req: Request, res: Response) => {
  const messageId = new ObjectId(req.params.id);
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

export const deleteMessage = async (req: Request, res: Response) => {
  const messageId = new ObjectId(req.params.messageId);
  const userId = new ObjectId(req.user!.userId);
  const message = await messagesRepository.findOne({ _id: messageId });
  if (!message) {
    return res.status(404).json({ error: 'MESSAGE NOT FOUND!' });
  }
  if (message.senderId.toString() !== userId.toString()) {
    return res.status(403).json({ error: 'NOT AUTHORIZED TO DELETE THE MESSAGE!' });
  }
  const result = await messagesRepository.updateOne(
    { _id: messageId, senderId: userId },
    { $set: { deleted: true, deletedAt: new Date(), message: '', imageURL: '' } },
  );
  await messagesRepository.deleteOne({ senderId: userId, _id: messageId });
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

export const deleteMessageReactions = async (req: Request, res: Response) => {
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
  if (!ObjectId.isValid(req.params.groupId)) {
    return res.status(400).json({ message: 'INVALID GROUP ID!' });
  }
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
  if (!ObjectId.isValid(req.params.memberId && req.params.groupId)) {
    return res.status(400).json({ message: 'OBJECT ID IS NOT VALID!' });
  }
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
  if (!ObjectId.isValid(req.params.groupId)) {
    console.log('error');
    return res.status(404).json({ error: 'INVALID ID!' });
  }
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
  if (!ObjectId.isValid(req.params.groupId)) {
    return res.status(200).json({ message: 'INVALID ID!' });
  }
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
  if (!ObjectId.isValid(req.params.messageId)) {
    return res.status(400).json({ message: 'INVALID ID!' });
  }
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
  if (!ObjectId.isValid(req.params.messageId)) {
    return res.status(404).json({ error: 'MESSAGE ID NOT FOUND!' });
  }
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
  if (!ObjectId.isValid(req.params.groupId)) {
    return res.status(400).json({ message: 'INVALID ID' });
  }
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
  if (!ObjectId.isValid(req.params.groupId || req.params.moderatorId)) {
    return res.status(400).json({ message: 'INVALID ID' });
  }
  const userId = new ObjectId(req.user!.userId);
  const groupId = new ObjectId(req.params.groupId);
  const moderatorId = new ObjectId(req.params.moderatorId);

  const group = await groupsRepository.findOne({ _id: groupId });

  if (!group) {
    return res.status(404).json({ message: 'GROUP NOT FOUND!' });
  }

  const isAdmin = group.adminId.equals(userId);
  const isModerator = group.moderators.map((id) => id.equals(moderatorId));

  if (!isAdmin) {
    return res.status(401).json({ message: 'UNAUTHORIZED!' });
  }

  if (!isModerator) {
    return res.status(400).json({ message: 'UPDATE MEMBER TO MODERATOR TO SET AS A ADMIN' });
  }

  const updatedGroup = await groupsRepository.findOneAndUpdate(
    { _id: groupId },
    { $set: { adminId: moderatorId } },
    { returnDocument: 'after' },
  );

  return res.status(200).json(updatedGroup);
};

export const kickMemberFromGroup = async (req: Request, res: Response) => {
  if (!ObjectId.isValid(req.params.memberId)) {
    return res.status(404).json({ message: 'ID NOT FOUND!' });
  }
  const adminId = new ObjectId(req.user!.userId);
  const groupId = new ObjectId(req.params.groupId);
  const memberId = new ObjectId(req.params.memberId);
  const group = await groupsRepository.findOne({ _id: groupId });

  if (!group) {
    return res.status(404).json({ message: 'GROUP NOT FOUND!❌' });
  }

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
  if (!ObjectId.isValid(req.params.groupId)) {
    return res.status(200).json({ message: 'INVALID ID ❌' });
  }
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

export const sendMessageReply = async (req: Request, res: Response) => {
  const senderId = new ObjectId(req.user!.userId);
  const body = req.body as SendReplyInput;

  const messageId = new ObjectId(body.messageId);
  const receiverId = new ObjectId(body.receiverId);
  const channel = await getOrCreateChannel(senderId, receiverId);

  const replyMessage = {
    channelId: channel._id,
    message: body.message,
    isExclusive: body.isExclusive,
    price: body.price ?? null,
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
