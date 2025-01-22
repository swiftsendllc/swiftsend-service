import { ObjectId } from 'mongodb';

export interface MessagesEntity {
  senderId: ObjectId;
  receiverId: ObjectId;
  channelId: ObjectId;
  message: string;
  imageURL: string | null;
  createdAt: Date | null;
  deletedAt: Date | null;
  editedAt: Date| null;
  deleted: boolean
  edited: boolean
}
