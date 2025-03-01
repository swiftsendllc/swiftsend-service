import { ObjectId } from 'mongodb';

export interface CreatePaymentInput {
  contentId: ObjectId;
  currency: string | "usd";
  amount: number;
  payment_method: string;
  payment_method_type: string[] ;
}
