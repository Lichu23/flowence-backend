/**
 * User Model (Multi-Store Architecture)
 * Handles user data and authentication
 */

import { BaseModel } from './BaseModel';
import { User, CreateUserData, UpdateUserData, UserWithStores } from '../types/user';
import bcrypt from 'bcryptjs';

export class UserModel extends BaseModel {
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Get user with their accessible stores
   */
  async findByIdWithStores(id: string): Promise<UserWithStores | null> {
    const user = await this.findById(id);
    if (!user) return null;

    const { data: userStores } = await this.supabase
      .from('user_stores')
      .select(`
        role,
        store:stores (
          id,
          name,
          address,
          phone
        )
      `)
      .eq('user_id', id);

    const stores = userStores?.map((us: any) => ({
      id: us.store?.id,
      name: us.store?.name,
      address: us.store?.address,
      phone: us.store?.phone,
      role: us.role
    })) || [];

    return {
      ...user,
      stores
    };
  }

  /**
   * Create new user with hashed password
   */
  async create(userData: CreateUserData): Promise<User> {
    // Hash password
    const password_hash = await bcrypt.hash(userData.password, 12);

    const { data, error } = await this.supabase
      .from('users')
      .insert({
        email: userData.email,
        password_hash,
        name: userData.name,
        role: userData.role
      })
      .select()
      .single();

    if (error) {
      this.handleError(error, 'Create user');
    }

    return data;
  }

  /**
   * Update user
   */
  async update(id: string, updates: UpdateUserData): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.handleError(error, 'Update user');
    }

    return data;
  }

  /**
   * Validate user password
   */
  async validatePassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;

    return user;
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const password_hash = await bcrypt.hash(newPassword, 12);

    const { error } = await this.supabase
      .from('users')
      .update({ password_hash })
      .eq('id', userId);

    if (error) {
      this.handleError(error, 'Update password');
    }
  }

  /**
   * Delete user (soft delete by removing from all stores)
   */
  async delete(id: string): Promise<void> {
    // First remove from all stores
    const { error: userStoreError } = await this.supabase
      .from('user_stores')
      .delete()
      .eq('user_id', id);

    if (userStoreError) {
      this.handleError(userStoreError, 'Remove user from stores');
    }

    // Then delete user
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      this.handleError(error, 'Delete user');
    }
  }

  /**
   * Get all users in a specific store
   */
  async findByStore(storeId: string): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('user_stores')
      .select(`
        user:users (*)
      `)
      .eq('store_id', storeId);

    if (error) {
      this.handleError(error, 'Get store users');
    }

    return (data?.map((item: any) => item.user).filter(Boolean) || []) as User[];
  }
}
