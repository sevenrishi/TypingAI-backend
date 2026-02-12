import { Router } from 'express';
import { saveResult, getMyResults } from '../controllers/resultController.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();

router.post('/', requireAuth, saveResult);
router.get('/me', requireAuth, getMyResults);

export default router;
