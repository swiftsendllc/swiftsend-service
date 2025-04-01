import { ObjectId } from 'mongodb';

export interface AssetsEntity {
  creatorId: ObjectId;
  originalURL: string;
  blurredURL: string;
  type: string;
  createdAt: Date;
  deletedAt: Date;
  updatedAt: Date;
}