import { ObjectId } from 'mongodb';

export interface MessageInput {
  receiverId: ObjectId;
  message: string | null;
  imageURL: string | null;
}
