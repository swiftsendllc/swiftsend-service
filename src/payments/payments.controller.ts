import { Router } from 'express';
import { auth, validateObjectId } from '../auth/middleware';
import {
  attachPaymentMethod,
  confirmCard,
  createPayment,
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  editSubscriptionPlan,
  getCard,
  getSubscriptionPlans,
} from './payments.service';

const router = Router();

router.post('/create/payment', auth, createPayment);

router.post('/payments/confirm-card', auth, confirmCard);

router.get('/customer/card', auth, getCard);

router.post('/payments/attach-card', auth, attachPaymentMethod);

router.post('/subscription/plan/create', auth, createSubscriptionPlan);

router.get('/subscription/plans/:creatorId', validateObjectId(['creatorId']), auth, getSubscriptionPlans);

router.patch(
  '/subscription/plan/edit/:subscription_plan_id',
  validateObjectId(['subscription_plan_id']),
  auth,
  editSubscriptionPlan,
);

router.delete(
  '/subscription/plan/delete/:subscription_plan_id',
  validateObjectId(['subscription_plan_id']),
  auth,
  deleteSubscriptionPlan,
);

export default router;
