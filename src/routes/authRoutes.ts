import { Router } from 'express';
import { register, login, forgotPassword, verifyResetCode, resetPassword, activateAccount } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);
router.get('/activate', activateAccount);

export default router;
