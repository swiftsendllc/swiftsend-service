import { ObjectId } from 'mongodb';

export interface CreatePaymentInput {
  contentId: ObjectId;
  currency: string | "usd";
  amount: number;
  paymentMethodType: [string] ;
}
