import { ObjectId } from 'mongodb';

export interface MessagesEntity {
  senderId: ObjectId;
  receiverId: ObjectId;
  message: string;
  imageURL: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  editedAt: Date | null;
}
