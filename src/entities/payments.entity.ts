import { ObjectId } from 'mongodb';

export interface PaymentsEntity {
  customerId: ObjectId;
  creatorId: ObjectId;
  contentId: ObjectId;
  stripe_payment_id: string;
  amount: number;
  status: string;
  currency: string
  createdAt: Date;
}
