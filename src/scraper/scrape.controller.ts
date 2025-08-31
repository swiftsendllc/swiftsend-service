import { Router } from 'express';
import { initiate } from './scrape.service';

const router = Router();

router.post('/scrape', initiate);

export default router;
