/**
 * Invitation Controller
 * Handles HTTP requests for invitation management
 */

import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { InvitationService } from '../services/InvitationService';
import { ApiResponse } from '../types';

const invitationService = new InvitationService();

export class InvitationController {
  /**
   * Validation rules for sending invitation
   */
  static sendInvitationValidation = [
    body('store_id')
      .notEmpty()
      .withMessage('Store ID is required')
      .isUUID()
      .withMessage('Store ID must be a valid UUID'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('role')
      .isIn(['employee', 'owner'])
      .withMessage('Role must be either employee or owner')
  ];

  /**
   * Validation rules for accepting invitation
   */
  static acceptInvitationValidation = [
    body('token')
      .notEmpty()
      .withMessage('Token is required'),
    body('name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Name is required and must be less than 255 characters'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
  ];

  /**
   * Send an invitation
   * @route POST /api/invitations
   */
  async sendInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array().map(error => ({
              field: error.type === 'field' ? error.path : 'unknown',
              message: error.msg,
              value: error.type === 'field' ? error.value : undefined
            }))
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      const { store_id, email, role } = req.body;

      const result = await invitationService.sendInvitation({
        store_id,
        email,
        role: role || 'employee',
        invited_by: userId
      });

      const response: ApiResponse = {
        success: true,
        data: {
          invitation: result.invitation,
          invitationUrl: result.invitationUrl
        },
        message: 'Invitation sent successfully',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all invitations for a store
   * @route GET /api/invitations/store/:storeId
   */
  async getStoreInvitations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.params['storeId'];
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      if (!storeId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Store ID is required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const invitations = await invitationService.getStoreInvitations(storeId, userId);

      const response: ApiResponse = {
        success: true,
        data: invitations,
        message: 'Invitations retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending invitations for a store
   * @route GET /api/invitations/store/:storeId/pending
   */
  async getPendingInvitations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.params['storeId'];
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      if (!storeId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Store ID is required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const invitations = await invitationService.getPendingInvitations(storeId, userId);

      const response: ApiResponse = {
        success: true,
        data: invitations,
        message: 'Pending invitations retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate invitation token
   * @route GET /api/invitations/validate/:token
   */
  async validateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.params['token'];

      if (!token) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Token is required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const result = await invitationService.validateToken(token);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: result.valid ? 'Token is valid' : 'Token is invalid',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accept invitation
   * @route POST /api/invitations/accept
   */
  async acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array().map(error => ({
              field: error.type === 'field' ? error.path : 'unknown',
              message: error.msg,
              value: error.type === 'field' ? error.value : undefined
            }))
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const { token, name, password } = req.body;

      const result = await invitationService.acceptInvitation({
        token,
        name,
        password
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Invitation accepted successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke invitation
   * @route POST /api/invitations/:id/revoke
   */
  async revokeInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invitationId = req.params['id'];
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      if (!invitationId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invitation ID is required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      await invitationService.revokeInvitation(invitationId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Invitation revoked successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend invitation
   * @route POST /api/invitations/:id/resend
   */
  async resendInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invitationId = req.params['id'];
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      if (!invitationId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invitation ID is required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const result = await invitationService.resendInvitation(invitationId, userId);

      const response: ApiResponse = {
        success: true,
        data: {
          invitation: result.invitation,
          invitationUrl: result.invitationUrl
        },
        message: 'Invitation resent successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invitation statistics for a store
   * @route GET /api/invitations/store/:storeId/stats
   */
  async getStoreStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storeId = req.params['storeId'];
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(401).json(response);
        return;
      }

      if (!storeId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Store ID is required'
          },
          timestamp: new Date().toISOString()
        };
        res.status(400).json(response);
        return;
      }

      const stats = await invitationService.getStoreStats(storeId, userId);

      const response: ApiResponse = {
        success: true,
        data: stats,
        message: 'Statistics retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const invitationController = new InvitationController();

