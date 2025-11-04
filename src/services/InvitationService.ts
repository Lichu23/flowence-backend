/**
 * Invitation Service
 * Business logic for managing store employee invitations
 */

import { InvitationModel } from '../models/InvitationModel';
import { UserModel } from '../models/UserModel';
import { StoreModel } from '../models/StoreModel';
import { UserStoreModel } from '../models/UserStoreModel';
import { UserInvitation } from '../types/user';
import { config } from '../config';
import { emailService } from './EmailService';

const invitationModel = new InvitationModel();
const userModel = new UserModel();
const storeModel = new StoreModel();
const userStoreModel = new UserStoreModel();

export interface SendInvitationData {
  store_id: string;
  email: string;
  role: 'employee' | 'owner';
  invited_by: string;
}

export interface AcceptInvitationData {
  token: string;
  name: string;
  password: string;
}

export class InvitationService {
  /**
   * Create and send an invitation
   */
  async sendInvitation(data: SendInvitationData): Promise<{
    invitation: UserInvitation;
    invitationUrl: string;
  }> {
    console.log('📨 Sending invitation...');
    console.log(`  Store: ${data.store_id}`);
    console.log(`  Email: ${data.email}`);
    console.log(`  Role: ${data.role}`);

    // Validate that the store exists
    const store = await storeModel.findById(data.store_id);
    if (!store) {
      throw new Error('Store not found');
    }

    // Validate that the inviter is the owner of the store
    const isOwner = await storeModel.isOwner(data.invited_by, data.store_id);
    if (!isOwner) {
      throw new Error('Only store owners can send invitations');
    }

    // Check if user already exists
    const existingUser = await userModel.findByEmail(data.email);
    if (existingUser) {
      // Check if user already has access to this store
      const hasAccess = await userStoreModel.hasAccess(existingUser.id, data.store_id);
      if (hasAccess) {
        throw new Error('User already has access to this store');
      }
    }

    // Check if there's already a pending invitation
    const existingInvitation = await invitationModel.findByEmailAndStore(data.email, data.store_id);
    if (existingInvitation) {
      // Revoke the old invitation
      await invitationModel.markAsRevoked(existingInvitation.id);
    }

    // Create invitation with 7 days expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await invitationModel.create({
      ...data,
      expires_at: expiresAt
    });

    // Generate invitation URL
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    const invitationUrl = `${frontendUrl}/accept-invitation?token=${invitation.token}`;

    console.log('✅ Invitation created successfully');
    console.log(`  Token: ${invitation.token.substring(0, 10)}...`);
    console.log(`  URL: ${invitationUrl}`);

    // Send invitation email
    try {
      const inviter = await userModel.findById(data.invited_by);
      const inviterName = inviter?.name || 'El propietario';
      
      await emailService.sendInvitationEmail(
        data.email,
        store.name,
        inviterName,
        invitationUrl,
        expiresAt
      );
      console.log('📧 Invitation email sent successfully');
    } catch (emailError) {
      console.error('⚠️  Failed to send invitation email:', emailError);
      // Continue even if email fails - user can still use the URL
    }

    return {
      invitation,
      invitationUrl
    };
  }

  /**
   * Accept an invitation and create employee account
   */
  async acceptInvitation(data: AcceptInvitationData): Promise<{
    user: any;
    token: string;
  }> {
    console.log('✅ Accepting invitation...');

    // Find invitation
    const invitation = await invitationModel.findByToken(data.token);
    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    // Check if invitation is still valid
    const isValid = await invitationModel.isValid(data.token);
    if (!isValid) {
      throw new Error('Invitation has expired or is no longer valid');
    }

    // Check if user already exists with this email
    let user = await userModel.findByEmail(invitation.email);
    
    if (user) {
      // User exists, just add them to the store
      console.log('👤 User exists, adding to store...');
      
      // Check if user already has access
      const hasAccess = await userStoreModel.hasAccess(user.id, invitation.store_id);
      if (hasAccess) {
        throw new Error('User already has access to this store');
      }

      // Create user-store relationship
      await userStoreModel.create({
        user_id: user.id,
        store_id: invitation.store_id,
        role: invitation.role
      });

      // Mark invitation as accepted
      await invitationModel.markAsAccepted(invitation.id);

      // Generate token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        config.jwt.secret as string,
        {
          expiresIn: '30m',
          issuer: 'flowence',
          audience: 'flowence-users'
        }
      );

      // Get user with stores
      const userWithStores = await userModel.findByIdWithStores(user.id);
      if (!userWithStores) {
        throw new Error('Failed to retrieve user data');
      }

      const { password_hash, ...userProfile } = userWithStores;

      return {
        user: userProfile,
        token
      };
    }

    // Create new employee account
    console.log('🆕 Creating new employee account...');
    
    user = await userModel.create({
      email: invitation.email,
      password: data.password,
      name: data.name,
      role: 'employee'
    });

    // Create user-store relationship
    await userStoreModel.create({
      user_id: user.id,
      store_id: invitation.store_id,
      role: invitation.role
    });

    // Mark invitation as accepted
    await invitationModel.markAsAccepted(invitation.id);

    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      config.jwt.secret as string,
      {
        expiresIn: '30m',
        issuer: 'flowence',
        audience: 'flowence-users'
      }
    );

    // Get user with stores
    const userWithStores = await userModel.findByIdWithStores(user.id);
    if (!userWithStores) {
      throw new Error('Failed to retrieve user data');
    }

    const { password_hash, ...userProfile } = userWithStores;

    console.log('✅ Invitation accepted successfully');
    console.log(`  User ID: ${user.id}`);
    console.log(`  Store ID: ${invitation.store_id}`);

    return {
      user: userProfile,
      token
    };
  }

  /**
   * Get all invitations for a store
   */
  async getStoreInvitations(storeId: string, userId: string): Promise<UserInvitation[]> {
    // Verify user has access to this store
    const hasAccess = await userStoreModel.hasAccess(userId, storeId);
    if (!hasAccess) {
      throw new Error('You do not have access to this store');
    }

    // Expire old invitations first
    await invitationModel.expireOldInvitations();

    // Get all invitations
    return invitationModel.findByStore(storeId);
  }

  /**
   * Get pending invitations for a store
   */
  async getPendingInvitations(storeId: string, userId: string): Promise<UserInvitation[]> {
    // Verify user has access to this store
    const hasAccess = await userStoreModel.hasAccess(userId, storeId);
    if (!hasAccess) {
      throw new Error('You do not have access to this store');
    }

    // Expire old invitations first
    await invitationModel.expireOldInvitations();

    // Get pending invitations
    return invitationModel.findByStore(storeId, 'pending');
  }

  /**
   * Revoke an invitation
   */
  async revokeInvitation(invitationId: string, userId: string): Promise<void> {
    const invitation = await invitationModel.findById(invitationId);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Verify user is owner of the store
    const isOwner = await storeModel.isOwner(userId, invitation.store_id);
    if (!isOwner) {
      throw new Error('Only store owners can revoke invitations');
    }

    await invitationModel.markAsRevoked(invitationId);
    console.log('🚫 Invitation revoked:', invitationId);
  }

  /**
   * Resend an invitation
   */
  async resendInvitation(invitationId: string, userId: string): Promise<{
    invitation: UserInvitation;
    invitationUrl: string;
  }> {
    const invitation = await invitationModel.findById(invitationId);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Verify user is owner of the store
    const isOwner = await storeModel.isOwner(userId, invitation.store_id);
    if (!isOwner) {
      throw new Error('Only store owners can resend invitations');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Can only resend pending invitations');
    }

    // Note: Expiration extension could be added here if needed
    // For now, we just resend with the current expiration

    // Generate invitation URL
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    const invitationUrl = `${frontendUrl}/accept-invitation?token=${invitation.token}`;

    console.log('📨 Invitation resent:', invitationId);

    // Send invitation email
    try {
      const store = await storeModel.findById(invitation.store_id);
      const inviter = await userModel.findById(userId);
      const inviterName = inviter?.name || 'El propietario';
      const storeName = store?.name || 'la tienda';
      const expiresAt = new Date(invitation.expires_at);
      
      await emailService.sendInvitationEmail(
        invitation.email,
        storeName,
        inviterName,
        invitationUrl,
        expiresAt
      );
      console.log('📧 Invitation email resent successfully');
    } catch (emailError) {
      console.error('⚠️  Failed to resend invitation email:', emailError);
      // Continue even if email fails - user can still use the URL
    }

    return {
      invitation,
      invitationUrl
    };
  }

  /**
   * Get invitation statistics for a store
   */
  async getStoreStats(storeId: string, userId: string): Promise<any> {
    // Verify user has access to this store
    const hasAccess = await userStoreModel.hasAccess(userId, storeId);
    if (!hasAccess) {
      throw new Error('You do not have access to this store');
    }

    return invitationModel.getStoreStats(storeId);
  }

  /**
   * Validate invitation token
   */
  async validateToken(token: string): Promise<{
    valid: boolean;
    invitation?: UserInvitation;
    store?: any;
  }> {
    const invitation = await invitationModel.findByToken(token);
    
    if (!invitation) {
      return { valid: false };
    }

    const isValid = await invitationModel.isValid(token);
    
    if (!isValid) {
      return { valid: false, invitation };
    }

    // Get store information
    const store = await storeModel.findById(invitation.store_id);

    return {
      valid: true,
      invitation,
      store
    };
  }
}

export const invitationService = new InvitationService();

