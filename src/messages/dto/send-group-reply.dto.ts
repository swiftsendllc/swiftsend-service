import { ObjectId } from 'mongodb';

export interface SendGroupMessageReplyInput {
  message: string | null;
  imageURL: string | null;
  messageId: ObjectId;
}
