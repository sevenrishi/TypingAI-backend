import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email?: string;
  passwordHash?: string;
  displayName?: string;
  avatarId?: string;
  bestWPM?: number;
  averageAccuracy?: number;
  totalTestsTaken?: number;
  totalPracticeSessions?: number;
  totalBattles?: number;
  history: mongoose.Types.ObjectId[];
  sessions: mongoose.Types.ObjectId[];
  resetCode?: string;
  resetCodeExpiry?: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, unique: true, sparse: true },
  passwordHash: { type: String },
  displayName: { type: String },
  avatarId: { type: String, default: 'avatar-1' },
  bestWPM: { type: Number, default: 0 },
  averageAccuracy: { type: Number, default: 0 },
  totalTestsTaken: { type: Number, default: 0 },
  totalPracticeSessions: { type: Number, default: 0 },
  totalBattles: { type: Number, default: 0 },
  history: [{ type: Schema.Types.ObjectId, ref: 'TestResult' }],
  sessions: [{ type: Schema.Types.ObjectId, ref: 'Session' }],
  resetCode: { type: String, default: null },
  resetCodeExpiry: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
