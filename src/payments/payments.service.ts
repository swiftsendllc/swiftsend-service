import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import Stripe from 'stripe';
import { MessagesEntity } from '../entities/messages.entity';
import { PaymentsEntity } from '../entities/payments.entity';
import { PostsEntity } from '../entities/posts.entity';
import { PurchasesEntity } from '../entities/purchases.entity';
import { SubscriptionsEntity } from '../entities/subscriptions.entity';
import { UserProfilesEntity } from '../entities/user-profiles.entity';
import { UsersEntity } from '../entities/users.entity';
import { db } from '../rdb/mongodb';
import { Collections, ENV } from '../util/constants';
import { AttachPaymentMethodInput } from './dto/attach-payment.dto';
import { ConfirmCardInput } from './dto/confirm-card.dto';
import { CreatePaymentInput } from './dto/create-payment.dto';
import { CreateSubscriptions } from './dto/create-subscription.dto';

const payments = db.collection<PaymentsEntity>(Collections.PAYMENTS);
const purchases = db.collection<PurchasesEntity>(Collections.PURCHASES);
const posts = db.collection<PostsEntity>(Collections.POSTS);
const users = db.collection<UsersEntity>(Collections.USERS);
const messages = db.collection<MessagesEntity>(Collections.MESSAGES);
const userProfiles = db.collection<UserProfilesEntity>(Collections.USER_PROFILES);
const subscriptions = db.collection<SubscriptionsEntity>(Collections.SUBSCRIPTIONS);

const stripe = new Stripe(ENV('STRIPE_SECRET_KEY'), {
  apiVersion: '2025-02-24.acacia',
  appInfo: {
    name: 'stripe',
    version: '0.0.2',
  },
  typescript: true,
});
const returnUrl = ENV('DOMAIN');

export const createPayment = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const creatorId = new ObjectId(req.query.creatorId as string);
  const body = req.body as CreatePaymentInput;
  const newAmount = body.amount * 100;
  const contentId = new ObjectId(body.contentId);
  const currency = body.currency ?? 'inr';

  try {
    const userProfile = await userProfiles.findOne({ userId: userId });
    const customerId = userProfile?.stripeCustomerId;
    if (!userProfile && userProfile!.stripeCustomerId) {
      return res.status(400).json({ message: 'Stripe customer id is not found!' });
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: newAmount,
      currency: currency,
      customer: customerId!,
      automatic_payment_methods: {
        enabled: true,
      },
      payment_method: body.payment_method,
      confirm: true,
      description: 'Purchase',
      capture_method: 'automatic',
      return_url: returnUrl,
      metadata: {
        userId: userId.toString(),
        contentId: contentId.toString(),
        creatorId: creatorId.toString(),
      },
      shipping: {
        address: {
          city: 'Kolkata',
          country: 'India',
          state: 'wb',
          postal_code: '74333',
          line1: '123 street',
        },
        name: userProfile!.fullName,
      },
    });
    console.log('The last payment error is:', paymentIntent.last_payment_error);

    if (paymentIntent.status === 'requires_action') {
      res.status(200).json({
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
      });
    }
  } catch (error) {
    console.error('Payment Error:', error);
    return res.status(402).json({ message: 'FAILED TO CREATE PAYMENT!' });
  }
};

export const webhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const endPoint = ENV('STRIPE_WEBHOOK_SECRET_KEY') as string;
  let event: Stripe.Event;
  let status: Stripe.Subscription.Status;
  let subscription: Stripe.Subscription;

  if (!sig && !endPoint) {
    return res.status(400).json({ message: 'Missing webhook!' });
  }

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endPoint);
  } catch (error) {
    return res.status(400).json(`Webhook error: ${error}`);
  }

  const data: Stripe.Event.Data = event.data;
  const eventType: string = event.type;

  const paymentIntent: Stripe.PaymentIntent = data.object as Stripe.PaymentIntent;
  if (eventType === 'payment_intent.succeeded') {
    const userId = new ObjectId(paymentIntent.metadata.userId);
    const contentId = new ObjectId(paymentIntent.metadata.contentId);
    const creatorId = new ObjectId(paymentIntent.metadata.creatorId);
    await payments.insertOne({
      userId: userId,
      contentId,
      creatorId,
      amount: paymentIntent.amount,
      createdAt: new Date(),
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      stripe_payment_id: paymentIntent.id,
    });

    await purchases.insertOne({
      contentId: contentId,
      purchasedAt: new Date(),
      userId,
    });

    const contentIdBelongsToPost = await posts.findOne({ _id: contentId });
    if (contentIdBelongsToPost) {
      await posts.findOneAndUpdate(
        { _id: contentId },
        { $addToSet: { purchasedBy: userId } },
        { returnDocument: 'after' },
      );
    } else {
      await messages.findOneAndUpdate(
        { _id: contentId },
        { $addToSet: { purchasedBy: userId } },
        { returnDocument: 'after' },
      );
    }
  } else if (eventType === 'customer.subscription.created') {
    subscription = data.object as Stripe.Subscription;
    status = subscription.status as Stripe.Subscription.Status;
    const sub_userId = new ObjectId(subscription.metadata.userId);
    const sub_creatorId = new ObjectId(subscription.metadata.creatorId);
    await subscriptions.insertOne({
      userId: sub_userId,
      creatorId: sub_creatorId,
      expiresAt: new Date(subscription.current_period_end),
      startedAt: new Date(subscription.start_date),
      status: status,
      stripe_subscription_id: subscription.id,
    });
  }
};

export const attachPaymentMethod = async (req: Request, res: Response) => {
  try {
    const body = req.body as AttachPaymentMethodInput;
    const paymentMethodId = body.paymentMethodId;
    const userId = new ObjectId(req.user!.userId);
    const userProfile = await userProfiles.findOne({ userId: userId });
    const user = await users.findOne({ _id: userId });

    if (!userProfile && !user) {
      return res.status(404).json({ message: 'User not found' });
    }
    let customerId = userProfile?.stripeCustomerId;
    console.log(customerId);
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: userProfile!.fullName,
        email: user!.email,
        metadata: { userId: userId.toString() },
      });
      customerId = customer.id;
      await userProfiles.updateOne({ userId: userId }, { $set: { stripeCustomerId: customer.id } });
    }

    const intentResult = await stripe.setupIntents.create({
      confirm: true,
      customer: customerId,
      payment_method: paymentMethodId,
      usage: 'off_session',
      return_url: returnUrl,
    });

    if (intentResult.status === 'succeeded') {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    return res.json({
      paymentMethodId,
      nextActionUrl: intentResult.next_action?.redirect_to_url?.url,
      clientSecret: intentResult.client_secret,
    });
  } catch (error) {
    console.error('Error attaching payment method:', error);
    res.status(500).json({ error });
  }
};

export const confirmCard = async (req: Request, res: Response) => {
  const body = req.body as ConfirmCardInput;
  const userId = new ObjectId(req.user!.userId);
  const userProfile = await userProfiles.findOne({ userId: userId });
  if (!userProfile) {
    return res.status(404).json({ message: 'User not found!' });
  }
  const customerId = userProfile.stripeCustomerId;
  const paymentMethodId = body.paymentMethodId;
  if (customerId) {
    const confirmedCard = await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    return res.status(200).json(confirmedCard);
  }
};

export const getCard = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const userProfile = await userProfiles.findOne({ userId: userId });
  if (!userProfile) {
    return res.status(404).json({ message: 'User profile not found!' });
  }

  const user = await users.findOne({ _id: userProfile.userId });
  if (!user || !userProfile.stripeCustomerId) {
    return res.status(404).json({ message: 'Customer not found!' });
  }

  const customer = await stripe.customers.retrieve(userProfile.stripeCustomerId);
  if (!customer.deleted) {
    const paymentMethod = await stripe.paymentMethods.retrieve(
      customer.invoice_settings.default_payment_method as string,
    );
    return res.status(200).json({ ...paymentMethod, customer });
  }
};

export const createSubscription = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const body = req.body as CreateSubscriptions;
  const creatorId = body.creatorId;
  const priceId = ENV('STRIPE_PRICE_ID');
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      metadata: {
        userId: userId.toString(),
        creatorId: creatorId,
      },
      line_items: [
        {
          quantity: 1,
          price: priceId,
        },
      ],
    });
    return res.status(200).json({ sessionUrl: session.url, clientSecret: session.client_secret });
  } catch (error) {
    console.log('Subscription error:', error);
    return res.status(400).json(error);
  }
};

export const customerPortal = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const userProfile = await userProfiles.findOne({ userId: userId });
  if (!userProfile) {
    return res.status(404).json({ message: 'User not found!' });
  }
  if (!userProfile.stripeCustomerId) {
    return res.status(400).json({ message: 'Stripe customer id not found!' });
  }
  const customerId = userProfile.stripeCustomerId;
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return res.status(200).json({ portalSessionUrl: portalSession.url });
};
