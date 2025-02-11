import { ObjectId } from 'mongodb';

export interface ReactionsEntity {
  userId: ObjectId;
  messageId: ObjectId;
  reaction: string;
  createdAt: Date
}
