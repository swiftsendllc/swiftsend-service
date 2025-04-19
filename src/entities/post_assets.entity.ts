import { ObjectId } from 'mongodb';

export interface PostAssetsEntity {
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
  assetId: ObjectId;
  postId: ObjectId;
}
