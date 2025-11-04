import jwt from 'jsonwebtoken';
import { config } from '../config';
import { RefreshTokenModel, RefreshToken } from '../models/RefreshTokenModel';

export interface RefreshTokenMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export class RefreshTokenService {
  private refreshTokenModel: RefreshTokenModel;

  constructor() {
    this.refreshTokenModel = new RefreshTokenModel();
  }

  async issue(user: { id: string; email: string; role: string }, metadata?: RefreshTokenMetadata): Promise<{ refreshToken: string; record: RefreshToken }>
  {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh'
    };

    const refreshToken = jwt.sign(payload, config.jwt.secret as string, {
      expiresIn: '90d',
      issuer: 'flowence',
      audience: 'flowence-users'
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const record = await this.refreshTokenModel.create(user.id, refreshToken, expiresAt, metadata);

    return { refreshToken, record };
  }

  async validate(token: string): Promise<{ userId: string; tokenRecord: RefreshToken }>
  {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid refresh token');
    }

    const tokenRecord = await this.refreshTokenModel.validate(token);
    if (!tokenRecord) {
      throw new Error('Invalid or revoked refresh token');
    }

    let payload: any;
    try {
      payload = jwt.verify(token, config.jwt.secret as string, {
        issuer: 'flowence',
        audience: 'flowence-users'
      });
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired - please login again');
      }
      throw new Error('Invalid refresh token');
    }

    if (!payload || payload.type !== 'refresh' || !payload.userId) {
      throw new Error('Invalid token type - expected refresh token');
    }

    if (tokenRecord.user_id !== payload.userId) {
      throw new Error('Token subject mismatch');
    }

    return { userId: payload.userId as string, tokenRecord };
  }

  async revoke(token: string): Promise<void> {
    await this.refreshTokenModel.revoke(token);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokenModel.revokeAllForUser(userId);
  }
}

export const refreshTokenService = new RefreshTokenService();


