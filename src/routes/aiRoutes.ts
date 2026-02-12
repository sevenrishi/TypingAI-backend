import { Router } from 'express';
import { generate } from '../controllers/aiController.ts';

const router = Router();

router.post('/generate', generate);

export default router;
