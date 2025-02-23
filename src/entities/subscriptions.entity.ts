import { ObjectId } from 'mongodb';

export interface SubscriptionsEntity {
  userId: ObjectId;
  creatorId: ObjectId;
  stripe_subscription_id: ObjectId;
  status: string;
  startedAt: Date;
  expiresAt: Date;
}
