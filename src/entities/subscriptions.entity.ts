import { ObjectId } from 'mongodb';

export interface SubscriptionsEntity {
  userId: ObjectId;
  creatorId: ObjectId;
  stripe_subscription_id: string;
  status: string;
  startedAt: Date;
  expiresAt: Date;
  price: number;
  subscription_plans_id: ObjectId;
}
