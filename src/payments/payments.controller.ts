import { Router } from 'express';
import { auth } from '../auth/middleware';
import { attachPaymentMethod, confirmCard, createPayment, getCard } from './payments.service';

const router = Router();

router.post('/create/payment', auth, createPayment);

router.post('/payments/confirm-card', auth, confirmCard);

router.get('/customer/card', auth, getCard);

router.post('/payments/attach-card', auth, attachPaymentMethod);

export default router;
