import { ObjectId } from 'mongodb';

export interface MessageInput {
  receiverId: ObjectId;
  message: string;
  imageURL: string | null;
}
