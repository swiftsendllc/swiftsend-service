import { Router } from 'express';
import { auth } from '../auth/middleware';
import {
  attachPaymentMethod,
  confirmCard,
  createPayment,
  createSubscription,
  customerPortal,
  getCard,
} from './payments.service';

const router = Router();

router.post('/create/payment', auth, createPayment);

router.post('/payments/confirm-card', auth, confirmCard);

router.get('/customer/card', auth, getCard);

router.post('/payments/attach-card', auth, attachPaymentMethod);

router.post('/payments/subscriptions/create', auth, createSubscription);

router.post('/payments/subscriptions/customer/portal', auth, customerPortal);

export default router;
