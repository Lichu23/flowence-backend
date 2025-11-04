/**
 * RefreshToken Model
 * Manages persistent refresh tokens in the database
 */

import crypto from 'crypto';
import { BaseModel } from './BaseModel';

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  is_revoked: boolean;
  revoked_at: string | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  last_used_at: string;
}

export class RefreshTokenModel extends BaseModel {
  private tableName = 'refresh_tokens';

  /**
   * Hash a refresh token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Store a new refresh token
   */
  async create(
    userId: string,
    token: string,
    expiresAt: Date,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<RefreshToken> {
    const tokenHash = this.hashToken(token);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        user_agent: metadata?.userAgent || null,
        ip_address: metadata?.ipAddress || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Validate a refresh token
   */
  async validate(token: string): Promise<RefreshToken | null> {
    const tokenHash = this.hashToken(token);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('is_revoked', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;

    // Update last_used_at
    await this.supabase
      .from(this.tableName)
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    return data;
  }

  /**
   * Revoke a specific refresh token (single device logout)
   */
  async revoke(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    const { error } = await this.supabase
      .from(this.tableName)
      .update({
        is_revoked: true,
        revoked_at: new Date().toISOString(),
      })
      .eq('token_hash', tokenHash);

    if (error) throw error;
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  async revokeAllForUser(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({
        is_revoked: true,
        revoked_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_revoked', false);

    if (error) throw error;
  }

  /**
   * Get all active sessions for a user
   */
  async getActiveSessionsForUser(userId: string): Promise<RefreshToken[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('is_revoked', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpired(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .delete()
      .lt('expires_at', thirtyDaysAgo.toISOString())
      .select();

    if (error) throw error;
    return data?.length || 0;
  }
}

