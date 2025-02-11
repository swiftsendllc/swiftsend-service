import { ObjectId } from 'mongodb';

export interface GroupReactionsEntity {
  reaction: string;
  messageId: ObjectId;
  userId: ObjectId;
  createdAt: Date;
  reacted: boolean;
}
