import mongoose, { Schema } from 'mongoose';
import { ISession } from '~/types';

const sessionSchema: Schema<ISession> = new Schema({
  refreshTokenHash: {
    type: String,
    required: true,
  },
  /** Hash of the token this session issued before the latest rotation, accepted for a short grace window. */
  previousRefreshTokenHash: {
    type: String,
  },
  rotatedAt: {
    type: Date,
  },
  expiration: {
    type: Date,
    required: true,
    expires: 0,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tenantId: {
    type: String,
    index: true,
  },
});

export default sessionSchema;
