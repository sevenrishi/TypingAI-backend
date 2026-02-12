import { Response } from 'express';
import User from '../models/User.ts';
import TestResult from '../models/TestResult.ts';
import { AuthRequest } from '../middleware/auth.ts';

type StreakState = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  updatedAt?: Date | null;
};

type StreakSnapshot = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  todayActive: boolean;
  daysSinceActive: number | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const pad2 = (value: number) => String(value).padStart(2, '0');

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
};

const dateKeyToUtcDayNumber = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return null;
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
};

const diffDays = (fromKey: string, toKey: string) => {
  const fromDay = dateKeyToUtcDayNumber(fromKey);
  const toDay = dateKeyToUtcDayNumber(toKey);
  if (fromDay == null || toDay == null) return null;
  return toDay - fromDay;
};

const buildStreakSnapshot = (streak: StreakState, dateKey: string): StreakSnapshot => {
  const lastKey = streak.lastActiveDate;
  if (!lastKey) {
    return {
      currentStreak: 0,
      longestStreak: streak.longestStreak || 0,
      lastActiveDate: null,
      todayActive: false,
      daysSinceActive: null
    };
  }

  const dayDiff = diffDays(lastKey, dateKey);
  const normalizedDiff = dayDiff == null ? null : Math.max(0, dayDiff);
  const todayActive = normalizedDiff === 0;
  const currentStreak = normalizedDiff != null && normalizedDiff <= 1 ? streak.currentStreak || 0 : 0;

  return {
    currentStreak,
    longestStreak: streak.longestStreak || 0,
    lastActiveDate: lastKey,
    todayActive,
    daysSinceActive: normalizedDiff
  };
};

const applyStreakActivity = (streak: StreakState, dateKey: string): StreakState => {
  if (streak.lastActiveDate === dateKey) {
    return { ...streak, updatedAt: new Date() };
  }

  const lastKey = streak.lastActiveDate;
  const dayDiff = lastKey ? diffDays(lastKey, dateKey) : null;
  let nextCurrent = streak.currentStreak || 0;

  if (dayDiff == null || dayDiff > 1) {
    nextCurrent = 1;
  } else if (dayDiff === 1) {
    nextCurrent = Math.max(1, nextCurrent + 1);
  } else if (dayDiff <= 0) {
    nextCurrent = Math.max(1, nextCurrent);
  }

  const nextLongest = Math.max(streak.longestStreak || 0, nextCurrent);
  return {
    currentStreak: nextCurrent,
    longestStreak: nextLongest,
    lastActiveDate: dateKey,
    updatedAt: new Date()
  };
};

export async function getProfile(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const user = await User.findById(userId).select('-passwordHash').populate('history');
  if (!user) return res.status(404).json({ error: 'User not found' });

  // compute aggregate stats if needed
  const stats = await TestResult.find({ user: user._id }).sort({ createdAt: -1 }).limit(50);
  const avgAccuracy = stats.length ? (stats.reduce((s, r) => s + r.accuracy, 0) / stats.length) : 0;
  const bestWPM = stats.length ? Math.max(...stats.map(s => s.wpm)) : 0;

  return res.json({ user, bestWPM, averageAccuracy: avgAccuracy });
}

export async function updateAvatar(req: AuthRequest, res: Response) {
  const userId = req.userId;
  const { avatarId } = req.body;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!avatarId) return res.status(400).json({ error: 'Avatar ID required' });

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { avatarId },
      { new: true }
    ).select('-passwordHash');

    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({ user, message: 'Avatar updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update avatar' });
  }
}

export async function getProgress(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const dateKey = typeof req.query.dateKey === 'string'
    ? req.query.dateKey
    : toDateKey(new Date());

  const user = await User.findById(userId).select('streak learning');
  if (!user) return res.status(404).json({ error: 'User not found' });

  const streakState: StreakState = user.streak || {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null
  };

  const learning = user.learning
    ? {
      completedLessons: user.learning.completedLessons || [],
      certificate: user.learning.certificate || null,
      updatedAt: user.learning.updatedAt || null
    }
    : { completedLessons: [], certificate: null, updatedAt: null };

  return res.json({
    streak: buildStreakSnapshot(streakState, dateKey),
    learning
  });
}

export async function recordStreak(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const dateKey = typeof req.body?.dateKey === 'string'
    ? req.body.dateKey
    : toDateKey(new Date());

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const streakState: StreakState = user.streak || {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null
  };

  const nextStreak = applyStreakActivity(streakState, dateKey);
  user.streak = nextStreak;
  await user.save();

  return res.json({ streak: buildStreakSnapshot(nextStreak, dateKey) });
}

export async function updateLearningProgress(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { completedLessons, certificate } = req.body || {};

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (completedLessons !== undefined && !Array.isArray(completedLessons)) {
    return res.status(400).json({ error: 'completedLessons must be an array' });
  }

  const normalizedLessons = Array.isArray(completedLessons)
    ? Array.from(new Set(completedLessons.map((value: any) => Number(value)).filter((value: any) => Number.isFinite(value))))
    : (user.learning?.completedLessons || []);

  const nextCertificate = certificate || user.learning?.certificate || null;
  user.learning = {
    completedLessons: normalizedLessons,
    certificate: nextCertificate,
    updatedAt: new Date()
  };

  await user.save();
  return res.json({ learning: user.learning });
}
