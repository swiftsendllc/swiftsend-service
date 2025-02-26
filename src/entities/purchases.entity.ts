import { ObjectId } from 'mongodb';

export interface PurchasesEntity {
  userId: ObjectId;
  contentId: ObjectId;
  purchasedAt: Date;
}
