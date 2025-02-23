import { ObjectId } from 'mongodb';

export interface PaymentsEntity {
  userId: ObjectId;
  creatorId: ObjectId;
  postId: ObjectId;
  stripe_payment_id: ObjectId;
  amount: number;
  status: string;
  currency: string;
  createdAt: Date;
}
