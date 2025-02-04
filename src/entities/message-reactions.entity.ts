import { ObjectId } from 'mongodb';

export interface MessageReactionsEntity {
  userId: ObjectId;
  messageId: ObjectId;
  reaction: string;
  createdAt: Date
}
