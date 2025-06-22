import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { shake } from 'radash';
import Stripe from 'stripe';
import { io } from '..';
import { CreateSubscriptionPlanInput } from '../users/dto/create-subscription_plan.dto';
import { EditSubscriptionPlanInput } from '../users/dto/edit-subscription_plan.dto';
import { getEnv } from '../util/constants';
import {
  fanAssetsRepository,
  messagesRepository,
  paymentsRepository,
  postsRepository,
  purchasesRepository,
  subscriptionPlansRepository,
  subscriptionsRepository,
  userProfilesRepository,
  usersRepository,
} from '../util/repositories';
import { AttachPaymentMethodInput } from './dto/attach-payment.dto';
import { ConfirmCardInput } from './dto/confirm-card.dto';
import { CreatePaymentInput } from './dto/create-payment.dto';

const stripe = new Stripe(getEnv('STRIPE_SECRET_KEY'), {
  apiVersion: '2025-02-24.acacia',
  appInfo: {
    name: 'stripe',
    version: '0.0.2',
  },
  typescript: true,
});
const returnUrl = getEnv('DOMAIN');

export const createPayment = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const creatorId = new ObjectId(req.query.creatorId as string);
  const body = req.body as CreatePaymentInput;
  const newAmount = body.amount * 100;
  const contentId = new ObjectId(body.contentId);
  const currency = body.currency ?? 'inr';
  const purchaseType = req.query.purchaseType as string;

  try {
    const userProfile = await userProfilesRepository.findOne({ userId: userId });
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
        purchaseType: purchaseType,
      },
      shipping: {
        address: {
          city: 'Kolkata',
          country: userProfile!.region,
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
  const endPoint = getEnv('STRIPE_WEBHOOK_SECRET_KEY') as string;
  let event: Stripe.Event;

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
    const purchaseType = paymentIntent.metadata.purchaseType;
    switch (purchaseType) {
      case 'post':
        await paymentsRepository.insertOne({
          userId: userId,
          contentId,
          creatorId,
          amount: paymentIntent.amount,
          createdAt: new Date(),
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          stripe_payment_id: paymentIntent.id,
        });

        await purchasesRepository.insertOne({
          contentId: contentId,
          purchasedAt: new Date(),
          userId,
        });

        await fanAssetsRepository.insertOne({
          assetId: contentId,
          fanId: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          editedAt: null,
        });

        await postsRepository.updateOne({ _id: contentId }, { $addToSet: { purchasedBy: userId } });
        break;

      case 'message':
        await paymentsRepository.insertOne({
          userId: userId,
          contentId,
          creatorId,
          amount: paymentIntent.amount,
          createdAt: new Date(),
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          stripe_payment_id: paymentIntent.id,
        });

        await purchasesRepository.insertOne({
          contentId: contentId,
          purchasedAt: new Date(),
          userId,
        });
        await messagesRepository.updateOne({ _id: contentId }, { $addToSet: { purchasedBy: userId } });
        io.to(paymentIntent.metadata.creatorId).emit('hasPurchased', {
          messageId: contentId,
          purchasedBy: [userId],
          isPurchased: true,
        });
        break;

      case 'subscription':
        const subscriptionPlans = await subscriptionPlansRepository.findOne({ _id: contentId, creatorId: creatorId });
        if (subscriptionPlans)
          await subscriptionsRepository.insertOne({
            creatorId,
            userId,
            startedAt: new Date(),
            expiresAt: new Date(24 * 60 * 60 * 30),
            status: paymentIntent.status,
            stripe_subscription_id: paymentIntent.id,
            subscription_plans_id: subscriptionPlans._id,
            price: subscriptionPlans.price * 100,
          });
        break;

      default:
        return res.status(402).json({ error: 'SOMETHING WRONG HAPPENED' });
    }
  }
};

export const attachPaymentMethod = async (req: Request, res: Response) => {
  try {
    const body = req.body as AttachPaymentMethodInput;
    const paymentMethodId = body.paymentMethodId;
    const userId = new ObjectId(req.user!.userId);
    const userProfile = await userProfilesRepository.findOne({ userId: userId });
    const user = await usersRepository.findOne({ _id: userId });

    if (!userProfile && !user) {
      return res.status(404).json({ message: 'User not found' });
    }
    let customerId = userProfile?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: userProfile!.fullName,
        email: user!.email,
        metadata: { userId: userId.toString() },
      });
      customerId = customer.id;
      await userProfilesRepository.updateOne({ userId: userId }, { $set: { stripeCustomerId: customer.id } });
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
  const userProfile = await userProfilesRepository.findOne({ userId: userId });
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
  const userProfile = await userProfilesRepository.findOne({ userId: userId });
  if (!userProfile) {
    return res.status(404).json({ message: 'User profile not found!' });
  }

  const user = await usersRepository.findOne({ _id: userProfile.userId });
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

export const createSubscriptionPlan = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const body = req.body as CreateSubscriptionPlanInput;
  await subscriptionPlansRepository.insertOne({
    createdAt: new Date(),
    creatorId: userId,
    deletedAt: null,
    description: body.description,
    price: body.price,
    syncedAt: new Date(),
    tier: body.tier,
    bannerURL: null,
  });
  return res.status(200).json({ message: 'SUBSCRIPTION PLAN CREATED SUCCESSFULLY' });
};

export const getSubscriptionPlans = async (req: Request, res: Response) => {
  if (!ObjectId.isValid(req.params.creatorId)) {
    return res.status(404).json({ message: 'INVALID ID' });
  }
  const userId = new ObjectId(req.params.creatorId);
  const subscriptionPlans = await subscriptionPlansRepository.find({ creatorId: userId }).toArray();
  return res.status(200).json(subscriptionPlans);
};

export const deleteSubscriptionPlan = async (req: Request, res: Response) => {
  if (!ObjectId.isValid(req.params.subscription_plan_id)) {
    return res.status(404).json({ error: 'INVALID ID' });
  }
  const userId = new ObjectId(req.user!.userId);
  const subscription_plan_id = new ObjectId(req.params.subscription_plan_id);
  const planExists = await subscriptionPlansRepository.findOne({ _id: subscription_plan_id, creatorId: userId });

  if (!planExists) {
    return res.status(404).json({ message: 'INVALID CREDENTIALS' });
  }

  await subscriptionPlansRepository.deleteOne({ _id: subscription_plan_id, creatorId: userId });
  return res.status(200).json({ message: 'DELETED SUBSCRIPTION PLAN SUCCESSFULLY' });
};

export const editSubscriptionPlan = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const body = req.body as EditSubscriptionPlanInput;
  const subscription_plan_id = new ObjectId(req.params.subscription_plan_id);
  const planExists = await subscriptionPlansRepository.findOne({ _id: subscription_plan_id, creatorId: userId });
  if (!planExists) {
    return res.status(404).json({ message: 'INVALID CREDENTIALS' });
  }
  const updatedPlan = await subscriptionPlansRepository.findOneAndUpdate(
    { _id: subscription_plan_id, creatorId: userId },
    {
      $set: shake({
        price: body.price,
        description: body.description,
        tier: body.tier,
        bannerURL: body.bannerURL,
      }),
    },
    { returnDocument: 'after' },
  );
  return res.status(200).json(updatedPlan);
};
