import { ObjectId } from 'mongodb';

export interface SendReplyInput {
  message: string | null;
  messageId: ObjectId;
  receiverId: ObjectId;
}
