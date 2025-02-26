import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import Stripe from 'stripe';
import { PaymentsEntity } from '../entities/payments.entity';
import { PostsEntity } from '../entities/posts.entity';
import { PurchasesEntity } from '../entities/purchases.entity';
import { db } from '../rdb/mongodb';
import { Collections, ENV } from '../util/constants';
import { CreatePaymentInput } from './dto/create-payment.dto';

const payments = db.collection<PaymentsEntity>(Collections.PAYMENTS);
const purchases = db.collection<PurchasesEntity>(Collections.PURCHASES);
const posts = db.collection<PostsEntity>(Collections.POSTS);

const stripe = new Stripe(ENV('STRIPE_SECRET_KEY'), {
  apiVersion: '2025-02-24.acacia',
  appInfo: {
    name: 'stripe',
    version: '0.0.2',
  },
  typescript: true,
});

export const createPayment = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const body = req.body as CreatePaymentInput;
  const creatorId = new ObjectId(req.params.creatorId);
  const contentId = new ObjectId(body.contentId);
  const currency = body.currency ?? 'usd';
  const payment_method_type = body.paymentMethodType ?? ['card'];
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: body.amount,
      currency: currency,
      payment_method_types: payment_method_type,
    });

    await payments.insertOne({
      userId: userId,
      contentId: contentId,
      creatorId: creatorId,
      amount: body.amount,
      createdAt: new Date(),
      currency: currency,
      status: paymentIntent.status,
      stripe_payment_id: paymentIntent.id,
    });

    await purchases.insertOne({
      contentId: contentId,
      purchasedAt: new Date(),
      userId,
    });

    const purchased = await purchases.findOne({ userId: userId, contentId: contentId });

    if (purchased) {
      const purchasedPost = await posts.findOne({ _id: contentId });

      res.status(200).json({
        purchasedPost,
        clientSecret: paymentIntent.client_secret,
        nextAction: paymentIntent.next_action ?? 'No action required',
      });
    }
  } catch (error) {
    console.error('Payment Error:', error);
    return res.status(402).json({ message: 'FAILED TO CREATE PAYMENT!' });
  }
};

