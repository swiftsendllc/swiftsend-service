import { ObjectId } from 'mongodb';

export interface PostAssetsEntity {
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  assetId: ObjectId;
  postId: ObjectId;
}
