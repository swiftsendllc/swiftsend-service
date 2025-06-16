import { ObjectId } from 'mongodb';

export interface MessageInput {
  receiverId: ObjectId;
  message: string | null;
  isExclusive: boolean;
  price: number | null;
  assetIds: ObjectId[];
}
