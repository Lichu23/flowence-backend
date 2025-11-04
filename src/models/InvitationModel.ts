/**
 * Invitation Model
 * Handles database operations for store employee invitations
 */

import { BaseModel } from './BaseModel';
import { UserInvitation } from '../types/user';
import crypto from 'crypto';

export interface CreateInvitationData {
  store_id: string;
  email: string;
  role: 'employee' | 'owner';
  invited_by: string;
  expires_at?: Date;
}

export interface UpdateInvitationData {
  status?: 'pending' | 'accepted' | 'expired' | 'revoked';
  accepted_at?: Date;
}

export class InvitationModel extends BaseModel {
  /**
   * Create a new invitation
   */
  async create(data: CreateInvitationData): Promise<UserInvitation> {
    const token = this.generateToken();
    const expiresAt = data.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const { data: invitation, error } = await this.supabase
      .from('invitations')
      .insert({
        store_id: data.store_id,
        email: data.email.toLowerCase(),
        token: token,
        role: data.role,
        invited_by: data.invited_by,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create invitation: ${error.message}`);
    }

    return invitation;
  }

  /**
   * Find invitation by ID
   */
  async findById(id: string): Promise<UserInvitation | null> {
    const { data, error } = await this.supabase
      .from('invitations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Find invitation by token
   */
  async findByToken(token: string): Promise<UserInvitation | null> {
    const { data, error } = await this.supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Find invitations by store
   */
  async findByStore(storeId: string, status?: string): Promise<UserInvitation[]> {
    let query = this.supabase
      .from('invitations')
      .select('*')
      .eq('store_id', storeId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch invitations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Find invitation by email and store
   */
  async findByEmailAndStore(email: string, storeId: string): Promise<UserInvitation | null> {
    const { data, error } = await this.supabase
      .from('invitations')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Update invitation
   */
  async update(id: string, data: UpdateInvitationData): Promise<UserInvitation | null> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.accepted_at !== undefined) {
      updateData.accepted_at = data.accepted_at.toISOString();
    }

    const { data: invitation, error } = await this.supabase
      .from('invitations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update invitation: ${error.message}`);
    }

    return invitation;
  }

  /**
   * Delete (revoke) invitation
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('invitations')
      .delete()
      .eq('id', id);

    return !error;
  }

  /**
   * Mark invitation as accepted
   */
  async markAsAccepted(id: string): Promise<UserInvitation | null> {
    return this.update(id, {
      status: 'accepted',
      accepted_at: new Date()
    });
  }

  /**
   * Mark invitation as revoked
   */
  async markAsRevoked(id: string): Promise<UserInvitation | null> {
    return this.update(id, { status: 'revoked' });
  }

  /**
   * Expire old invitations
   */
  async expireOldInvitations(): Promise<number> {
    const { data, error } = await this.supabase
      .from('invitations')
      .update({ 
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      throw new Error(`Failed to expire invitations: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Check if invitation is valid
   */
  async isValid(token: string): Promise<boolean> {
    const invitation = await this.findByToken(token);
    
    if (!invitation) {
      return false;
    }

    if (invitation.status !== 'pending') {
      return false;
    }

    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      // Mark as expired
      await this.update(invitation.id, { status: 'expired' });
      return false;
    }

    return true;
  }

  /**
   * Get invitation statistics for a store
   */
  async getStoreStats(storeId: string): Promise<{
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    revoked: number;
  }> {
    const { data, error } = await this.supabase
      .from('invitations')
      .select('status')
      .eq('store_id', storeId);

    if (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }

    const stats = {
      total: 0,
      pending: 0,
      accepted: 0,
      expired: 0,
      revoked: 0
    };

    if (data) {
      stats.total = data.length;
      data.forEach(invitation => {
        switch (invitation.status) {
          case 'pending':
            stats.pending++;
            break;
          case 'accepted':
            stats.accepted++;
            break;
          case 'expired':
            stats.expired++;
            break;
          case 'revoked':
            stats.revoked++;
            break;
        }
      });
    }

    return stats;
  }

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
