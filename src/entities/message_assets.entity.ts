import { ObjectId } from 'mongodb';

export interface MessageAssetsEntity {
  messageId: ObjectId;
  assetId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
