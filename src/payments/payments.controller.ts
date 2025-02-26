import { Router } from 'express';
import { auth } from '../auth/middleware';
import { createPayment, getPayment } from './payments.service';

const router = Router();

router.post('/create/payment', auth, createPayment);

router.get('/payments/next', auth, getPayment);

export default router;
