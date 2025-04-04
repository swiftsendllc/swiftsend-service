import { ObjectId } from 'mongodb';

export interface CreatorAssetsEntity {
  creatorId: ObjectId;
  assetId: ObjectId;
  createdAt: Date;
  deletedAt: Date | null;
  updatedAt: Date | null;
}
