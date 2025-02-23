import { ObjectId } from 'mongodb';

export interface PurchasesEntity {
  userId: ObjectId;
  postId: ObjectId;
  purchasedAt: Date;
}
