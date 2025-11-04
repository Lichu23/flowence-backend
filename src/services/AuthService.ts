/**
 * Auth Service (Multi-Store Architecture)
 * Handles authentication with multi-store support
 */

import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserModel } from '../models/UserModel';
import { StoreModel } from '../models/StoreModel';
import { UserStoreModel } from '../models/UserStoreModel';
import { RefreshTokenModel } from '../models/RefreshTokenModel';
import { 
  RegisterData, 
  LoginCredentials, 
  AuthResponse 
} from '../types/user';
import { refreshTokenService } from './RefreshTokenService';

const userModel = new UserModel();
const storeModel = new StoreModel();
const userStoreModel = new UserStoreModel();
const refreshTokenModel = new RefreshTokenModel();

export class AuthService {
  /**
   * Register new owner with first store
   */
  async register(registerData: RegisterData): Promise<AuthResponse> {
    try {
      console.log('🔐 Starting user registration (multi-store)...');
      console.log('📧 Email:', registerData.email);
      console.log('👤 Name:', registerData.name);
      console.log('🏪 First Store:', registerData.store_name);
      if (registerData.store_address) {
        console.log('📍 Store Address:', registerData.store_address);
      }
      if (registerData.store_phone) {
        console.log('📞 Store Phone:', registerData.store_phone);
      }

      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(registerData.password);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Check if user already exists
      const existingUser = await userModel.findByEmail(registerData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // 1. Create user
      console.log('👤 Creating user...');
      const user = await userModel.create({
        email: registerData.email,
        password: registerData.password,
        name: registerData.name,
        role: 'owner'
      });
      console.log('✅ User created:', user.id);

      // 2. Create first store with address and phone if provided
      console.log('🏪 Creating first store...');
      const storeData: any = {
        owner_id: user.id,
        name: registerData.store_name,
        currency: 'USD',
        tax_rate: 0,
        low_stock_threshold: 5
      };

      // Only include address and phone if they were provided
      if (registerData.store_address) {
        storeData.address = registerData.store_address;
      }
      if (registerData.store_phone) {
        storeData.phone = registerData.store_phone;
      }

      const store = await storeModel.create(storeData);
      console.log('✅ Store created:', store.id);

      // 3. Create user-store relationship
      console.log('🔗 Creating user-store relationship...');
      await userStoreModel.create({
        user_id: user.id,
        store_id: store.id,
        role: 'owner'
      });
      console.log('✅ Relationship created');

      // 4. Get user with stores for response
      const userWithStores = await userModel.findByIdWithStores(user.id);
      if (!userWithStores) {
        throw new Error('Failed to retrieve user with stores');
      }

      // 5. Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);
      
      // 6. Store refresh token in database (expires in 90 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);
      await refreshTokenModel.create(user.id, refreshToken, expiresAt);

      console.log('✅ Registration completed successfully!');
      
      // Return user profile (without password_hash)
      const { password_hash, ...userProfile } = userWithStores;
      
      return {
        user: userProfile,
        token,
        refreshToken
      };
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login with email and password
   * Returns user with accessible stores
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('🔐 Login attempt for:', credentials.email);

      // Validate password
      const user = await userModel.validatePassword(credentials.email, credentials.password);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Get user with stores
      const userWithStores = await userModel.findByIdWithStores(user.id);
      if (!userWithStores) {
        throw new Error('Failed to retrieve user data');
      }

      // Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);
      
      // Store refresh token in database (expires in 90 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);
      await refreshTokenModel.create(user.id, refreshToken, expiresAt);

      console.log('✅ Login successful');
      console.log(`📊 User has access to ${userWithStores.stores.length} store(s)`);

      // Return user profile (without password_hash)
      const { password_hash, ...userProfile } = userWithStores;

      return {
        user: userProfile,
        token,
        refreshToken
      };
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  /**
   * Get current user with stores
   */
  async getCurrentUser(userId: string): Promise<AuthResponse['user']> {
    const userWithStores = await userModel.findByIdWithStores(userId);
    if (!userWithStores) {
      throw new Error('User not found');
    }

    // Return user profile (without password_hash)
    const { password_hash, ...userProfile } = userWithStores;
    return userProfile;
  }

  /**
   * Refresh token using long-lived refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      console.log('🔄 AuthService: Attempting to refresh token');
      console.log('🔑 AuthService: Refresh token (first 50 chars):', refreshToken.substring(0, 50) + '...');
      
      // 1. Validate refresh token in database
      const storedToken = await refreshTokenModel.validate(refreshToken);
      if (!storedToken) {
        throw new Error('Invalid or revoked refresh token');
      }
      
      // 2. Verify the JWT signature and structure
      const payload = jwt.verify(refreshToken, config.jwt.secret as string, {
        issuer: 'flowence',
        audience: 'flowence-users'
      }) as any;

      // 3. Verify it's actually a refresh token
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type - expected refresh token');
      }
      
      // 4. Get user with stores
      const userWithStores = await userModel.findByIdWithStores(payload.userId);
      if (!userWithStores) {
        throw new Error('User not found');
      }

      // 5. Validate refresh token using service (DB + JWT)
      const { userId } = await refreshTokenService.validate(refreshToken);

      if (userId !== userWithStores.id) {
        throw new Error('Token subject mismatch');
      }

      // 6. Generate new access token only (keep same refresh token)
      const newAccessToken = this.generateToken({
        id: userWithStores.id,
        email: userWithStores.email,
        role: userWithStores.role
      });

      console.log('🔄 Access token refreshed successfully for user:', userWithStores.email);

      // Return user profile (without password_hash)
      const { password_hash, ...userProfile } = userWithStores;

      return {
        user: userProfile,
        token: newAccessToken,
        refreshToken: refreshToken // Return the same refresh token
      };
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      if (error instanceof jwt.TokenExpiredError || (error instanceof Error && error.message.includes('expired'))) {
        throw new Error('Refresh token expired - please login again');
      }
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user - revokes the specific refresh token
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    try {
      if (refreshToken) {
        // Revoke specific token (single device logout)
        await refreshTokenModel.revoke(refreshToken);
        console.log('🚪 User logged out (single device)');
      } else {
        // Revoke all tokens (logout from all devices)
        await refreshTokenModel.revokeAllForUser(userId);
        console.log('🚪 User logged out (all devices)');
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Don't throw error on logout failure
    }
  }

  /**
   * Generate JWT access token (short-lived)
   */
  private generateToken(user: { id: string; email: string; role: string }): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access'
    };

    return jwt.sign(payload, config.jwt.secret as string, {
      expiresIn: '30m',
      issuer: 'flowence',
      audience: 'flowence-users'
    });
  }

  /**
   * Generate JWT refresh token (long-lived - 90 days)
   */
  private generateRefreshToken(user: { id: string; email: string; role: string }): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh'
    };

    return jwt.sign(payload, config.jwt.secret as string, {
      expiresIn: '90d', // 90 days - only revoked on logout
      issuer: 'flowence',
      audience: 'flowence-users'
    });
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const authService = new AuthService();
