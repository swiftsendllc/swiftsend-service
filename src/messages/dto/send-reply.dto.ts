import { ObjectId } from 'mongodb';

export interface SendReplyInput {
  message: string | null;
  imageURL: string | null;
  messageId: ObjectId;
  receiverId: ObjectId;
}
