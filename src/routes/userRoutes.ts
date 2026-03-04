import { Router } from 'express';
import { getProfile, updateAvatar, getProgress, recordStreak, updateLearningProgress } from '../controllers/userController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/me', requireAuth, getProfile);
router.put('/avatar', requireAuth, updateAvatar);
router.get('/progress', requireAuth, getProgress);
router.post('/streak/record', requireAuth, recordStreak);
router.put('/learning', requireAuth, updateLearningProgress);

export default router;
