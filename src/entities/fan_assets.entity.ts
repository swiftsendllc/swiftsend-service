import { ObjectId } from 'mongodb';

export interface FanAssetsEntity {
  fanId: ObjectId;
  assetId: ObjectId;
  createdAt: Date;
  editedAt: Date;
  updatedAt: Date;
}
