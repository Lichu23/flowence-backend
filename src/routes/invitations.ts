/**
 * Invitation Routes
 * API routes for invitation management
 */

import { Router } from 'express';
import { invitationController } from '../controllers/InvitationController';
import { InvitationController } from '../controllers/InvitationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required)

// Validate invitation token (public - for checking before accepting)
router.get(
  '/validate/:token',
  invitationController.validateToken.bind(invitationController)
);

// Accept invitation (public - creates new account)
router.post(
  '/accept',
  InvitationController.acceptInvitationValidation,
  invitationController.acceptInvitation.bind(invitationController)
);

// Protected routes (authentication required)

// Send invitation (owner only)
router.post(
  '/',
  authenticate,
  InvitationController.sendInvitationValidation,
  invitationController.sendInvitation.bind(invitationController)
);

// Get all invitations for a store
router.get(
  '/store/:storeId',
  authenticate,
  invitationController.getStoreInvitations.bind(invitationController)
);

// Get pending invitations for a store
router.get(
  '/store/:storeId/pending',
  authenticate,
  invitationController.getPendingInvitations.bind(invitationController)
);

// Get invitation statistics for a store
router.get(
  '/store/:storeId/stats',
  authenticate,
  invitationController.getStoreStats.bind(invitationController)
);

// Revoke invitation
router.post(
  '/:id/revoke',
  authenticate,
  invitationController.revokeInvitation.bind(invitationController)
);

// Resend invitation
router.post(
  '/:id/resend',
  authenticate,
  invitationController.resendInvitation.bind(invitationController)
);

export default router;

