import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { MessagesEntity } from '../entities/messages.entity';
import { db } from '../rdb/mongodb';
import { Collections } from '../util/constants';
import { EditMessageInput } from './dto/edit-message.dto';
import { MessageInput } from './dto/send-message.dto';

const messages = db.collection<MessagesEntity>(Collections.MESSAGES);

export const sendMessage = async (req: Request, res: Response) => {
  const senderId = new ObjectId(req.user!.userId);
  const receiverId = new ObjectId(req.params.id);
  const body = req.body as MessageInput;

  await messages.insertOne({
    message: body.message,
    imageURL: body.imageURL ?? null,
    senderId,
    receiverId,
    createdAt: new Date(),
    deletedAt: null,
    editedAt: null,
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
