import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/AuthService';
import { ApiResponse, LoginRequest, RegisterRequest, RefreshTokenRequest } from '../types';
import { ValidationError, AuthenticationError, ConflictError } from '../types';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Validation rules
  static loginValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 1 })
      .withMessage('Password is required')
  ];

  static registerValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Name is required and must be less than 255 characters'),
    body('store_name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Store name is required and must be less than 255 characters'),
    body('store_address')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Store address must be less than 500 characters'),
    body('store_phone')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Store phone must be less than 20 characters')
  ];

  static refreshTokenValidation = [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required')
  ];

  static changePasswordValidation = [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
  ];

  static forgotPasswordValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ];

  static resetPasswordValidation = [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
  ];

  async register(req: Request, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
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
        });
        return;
      }

      const registerData: RegisterRequest = req.body;
      console.log('📝 AuthController: Starting registration for:', registerData.email);
      
      const result = await this.authService.register(registerData);
      console.log('✅ AuthController: Registration service completed successfully');

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'User registered successfully',
        timestamp: new Date().toISOString()
      };

      console.log('📤 AuthController: Sending response:', {
        success: response.success,
        hasData: !!response.data,
        message: response.message,
        hasToken: !!(response.data as any)?.token,
        userId: (response.data as any)?.user?.id,
        storesCount: (response.data as any)?.user?.stores?.length || 0
      });

      // Log the complete response structure
      console.log('📤 AuthController: Full response object being sent:', JSON.stringify(response, null, 2));

      res.status(201).json(response);
    } catch (error) {
      console.error('❌ AuthController: Registration error occurred:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');

      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (error instanceof ConflictError) {
        res.status(409).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: (error as ConflictError).message
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Registration failed'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
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
        });
        return;
      }

      const loginData: LoginRequest = req.body;
      const result = await this.authService.login(loginData);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Login successful',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Login error:', error);

      if (error instanceof AuthenticationError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // For other errors, check if it's an authentication-related error
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      const isAuthError = errorMessage.toLowerCase().includes('password') || 
                          errorMessage.toLowerCase().includes('email') ||
                          errorMessage.toLowerCase().includes('invalid');

      res.status(isAuthError ? 401 : 500).json({
        success: false,
        error: {
          code: isAuthError ? 'AUTHENTICATION_FAILED' : 'LOGIN_FAILED',
          message: errorMessage
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
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
        });
        return;
      }

      const { refreshToken }: RefreshTokenRequest = req.body;
      console.log('🔄 AuthController: Refresh token request received');
      console.log('🔑 AuthController: Refresh token (first 50 chars):', refreshToken?.substring(0, 50) + '...');
      
      const result = await this.authService.refreshToken(refreshToken);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Token refreshed successfully',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Token refresh error:', error);

      if (error instanceof AuthenticationError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: 'Token refresh failed'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  async changePassword(_req: Request, res: Response): Promise<void> {
    // TODO: Implement change password functionality
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Change password feature coming soon'
      },
      timestamp: new Date().toISOString()
    });
  }

  async forgotPassword(_req: Request, res: Response): Promise<void> {
    // TODO: Implement forgot password functionality
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Forgot password feature coming soon'
      },
      timestamp: new Date().toISOString()
    });
  }

  async resetPassword(_req: Request, res: Response): Promise<void> {
    // TODO: Implement reset password functionality
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Reset password feature coming soon'
      },
      timestamp: new Date().toISOString()
    });
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      console.log('🚪 AuthController: Logout request received');
      
      // Get refresh token from body (optional)
      const { refreshToken } = req.body;
      
      // Try to get user from token, but don't fail if token is invalid
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
      
      if (token) {
        try {
          // Try to decode the token to get user info (without verification)
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(token);
          
          if (decoded && decoded.userId) {
            console.log('👤 AuthController: Logging out user:', decoded.userId);
            // Revoke the specific refresh token if provided, otherwise revoke all
            await this.authService.logout(decoded.userId, refreshToken);
          }
        } catch (tokenError) {
          console.log('⚠️ AuthController: Invalid token for logout, but continuing...');
          // Continue with logout even if token is invalid
        }
      }

      const response: ApiResponse = {
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString()
      };

      console.log('✅ AuthController: Logout completed successfully');
      res.status(200).json(response);
    } catch (error) {
      console.error('❌ AuthController: Logout error:', error);

      // Even if logout fails, return success to client
      const response: ApiResponse = {
        success: true,
        message: 'Logout completed',
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      console.log('👤 AuthController: Getting user profile with stores for:', userId);
      
      // Get user with stores from service
      const userWithStores = await this.authService.getCurrentUser(userId);
      
      const response: ApiResponse = {
        success: true,
        data: {
          user: userWithStores
        },
        message: 'User profile retrieved successfully',
        timestamp: new Date().toISOString()
      };

      console.log('📤 AuthController: Sending user profile with', userWithStores.stores.length, 'stores');

      res.json(response);
    } catch (error) {
      console.error('Get user profile error:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'PROFILE_RETRIEVAL_FAILED',
          message: 'Failed to retrieve user profile'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}

