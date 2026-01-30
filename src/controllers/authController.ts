import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import User from '../models/User';
import { sendPasswordResetEmail } from '../utils/emailService';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

export async function register(req: Request, res: Response) {
  const { email, password, displayName } = req.body;
  if (!password || typeof password !== 'string') return res.status(400).json({ error: 'Password required' });

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = new User({ email, passwordHash: hash, displayName });
    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user._id, displayName: user.displayName, email: user.email } });
  } catch (err: any) {
    if (err.code === 11000) return res.status(400).json({ error: 'Email already exists' });
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash || '');
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token, user: { id: user._id, displayName: user.displayName, email: user.email } });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'No account present in this mail id.' });
    }

    const resetCode = Math.random().toString().slice(2, 8).padStart(6, '0');
    const resetCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.resetCode = resetCode;
    user.resetCodeExpiry = resetCodeExpiry;
    await user.save();

    await sendPasswordResetEmail(email, resetCode);

    return res.status(200).json({ message: 'If an account exists, a reset code has been sent' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Failed to process password reset request' });
  }
}

export async function verifyResetCode(req: Request, res: Response) {
  const { email, resetCode } = req.body;

  if (!email || !resetCode) {
    return res.status(400).json({ error: 'Email and reset code are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    if (user.resetCode !== resetCode) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    if (!user.resetCodeExpiry || new Date() > user.resetCodeExpiry) {
      return res.status(400).json({ error: 'Reset code has expired' });
    }

    return res.status(200).json({ message: 'Reset code verified successfully' });
  } catch (error: any) {
    console.error('Verify reset code error:', error);
    return res.status(500).json({ error: 'Failed to verify reset code' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  const { email, resetCode, newPassword, confirmPassword } = req.body;

  if (!email || !resetCode || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    if (user.resetCode !== resetCode) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    if (!user.resetCodeExpiry || new Date() > user.resetCodeExpiry) {
      return res.status(400).json({ error: 'Reset code has expired' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = passwordHash;
    user.resetCode = null;
    user.resetCodeExpiry = null;
    await user.save();

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
}
