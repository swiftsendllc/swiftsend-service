import { ObjectId } from 'mongodb';

export interface MessagesEntity {
  senderId: ObjectId;
  receiverId: ObjectId;
  channelId: ObjectId;
  message: string;
  imageURL: string | null;
  createdAt: Date;
  deletedAt: Date;
  editedAt: Date;
}
