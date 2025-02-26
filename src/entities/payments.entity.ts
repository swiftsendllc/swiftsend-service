import { ObjectId } from 'mongodb';

export interface PaymentsEntity {
  userId: ObjectId;
  creatorId: ObjectId;
  contentId: ObjectId;
  stripe_payment_id: string;
  amount: number;
  status: string;
  currency: string | "usd";
  createdAt: Date;
}
