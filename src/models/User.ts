import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email?: string;
  passwordHash?: string;
  displayName?: string;
  googleId?: string;
  photoUrl?: string;
  avatarId?: string;
  bestWPM?: number;
  averageAccuracy?: number;
  totalTestsTaken?: number;
  totalPracticeSessions?: number;
  totalBattles?: number;
  history: mongoose.Types.ObjectId[];
  sessions: mongoose.Types.ObjectId[];
  streak?: {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string | null;
    updatedAt?: Date | null;
  };
  learning?: {
    completedLessons: number[];
    certificate?: {
      id: string;
      issuedTo: string;
      courseName: string;
      issuedAt: string;
      lessonCount: number;
    } | null;
    updatedAt?: Date | null;
  };
  resetCode?: string;
  resetCodeExpiry?: Date;
  isActivated?: boolean;
}

const CertificateSchema = new Schema({
  id: { type: String },
  issuedTo: { type: String },
  courseName: { type: String },
  issuedAt: { type: String },
  lessonCount: { type: Number }
}, { _id: false });

const UserSchema = new Schema<IUser>({
  email: { type: String, unique: true, sparse: true },
  passwordHash: { type: String },
  displayName: { type: String },
  googleId: { type: String, unique: true, sparse: true, index: true },
  photoUrl: { type: String },
  avatarId: { type: String, default: 'avatar-1' },
  bestWPM: { type: Number, default: 0 },
  averageAccuracy: { type: Number, default: 0 },
  totalTestsTaken: { type: Number, default: 0 },
  totalPracticeSessions: { type: Number, default: 0 },
  totalBattles: { type: Number, default: 0 },
  history: [{ type: Schema.Types.ObjectId, ref: 'TestResult' }],
  sessions: [{ type: Schema.Types.ObjectId, ref: 'Session' }],
  streak: {
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: null },
    updatedAt: { type: Date, default: null }
  },
  learning: {
    completedLessons: { type: [Number], default: [] },
    certificate: { type: CertificateSchema, default: null },
    updatedAt: { type: Date, default: null }
  },
  resetCode: { type: String, default: null },
  resetCodeExpiry: { type: Date, default: null },
  isActivated: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
