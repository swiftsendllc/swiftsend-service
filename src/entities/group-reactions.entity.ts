import { ObjectId } from 'mongodb';

export interface GroupReactionsEntity {
  reaction: string;
  messageId: ObjectId;
  senderId: ObjectId;
  createdAt: Date;
}
