/**
 * UserStore Model
 * Handles many-to-many relationship between users and stores
 */

import { BaseModel } from './BaseModel';
import { UserStore, CreateUserStoreData } from '../types/user-store';

export class UserStoreModel extends BaseModel {
  /**
   * Get all stores for a user
   */
  async getUserStores(userId: string): Promise<UserStore[]> {
    const { data, error } = await this.supabase
      .from('user_stores')
      .select(`
        *,
        store:stores (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.handleError(error, 'Get user stores');
    }

    return data || [];
  }

  /**
   * Get all users for a store
   */
  async getStoreUsers(storeId: string): Promise<UserStore[]> {
    const { data, error } = await this.supabase
      .from('user_stores')
      .select(`
        *,
        user:users (id, email, name, role, created_at, updated_at)
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      this.handleError(error, 'Get store users');
    }

    return data || [];
  }

  /**
   * Check if user has access to store
   */
  async hasAccess(userId: string, storeId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('user_stores')
      .select('id')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .single();

    if (error) {
      return false;
    }

    return !!data;
  }

  /**
   * Get user's role in a specific store
   */
  async getUserRole(userId: string, storeId: string): Promise<'owner' | 'employee' | null> {
    const { data, error } = await this.supabase
      .from('user_stores')
      .select('role')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .single();

    if (error) {
      return null;
    }

    return data?.role || null;
  }

  /**
   * Create user-store relationship
   */
  async create(relationshipData: CreateUserStoreData): Promise<UserStore> {
    // Check if relationship already exists
    const existing = await this.hasAccess(
      relationshipData.user_id,
      relationshipData.store_id
    );

    if (existing) {
      throw new Error('User is already associated with this store');
    }

    const { data, error } = await this.supabase
      .from('user_stores')
      .insert({
        user_id: relationshipData.user_id,
        store_id: relationshipData.store_id,
        role: relationshipData.role
      })
      .select()
      .single();

    if (error) {
      this.handleError(error, 'Create user-store relationship');
    }

    return data;
  }

  /**
   * Update user's role in a store
   */
  async updateRole(
    userId: string,
    storeId: string,
    newRole: 'owner' | 'employee'
  ): Promise<UserStore> {
    const { data, error } = await this.supabase
      .from('user_stores')
      .update({ role: newRole })
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) {
      this.handleError(error, 'Update user role');
    }

    return data;
  }

  /**
   * Remove user from store
   */
  async remove(userId: string, storeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_stores')
      .delete()
      .eq('user_id', userId)
      .eq('store_id', storeId);

    if (error) {
      this.handleError(error, 'Remove user from store');
    }
  }

  /**
   * Get stores where user is owner
   */
  async getOwnedStores(userId: string): Promise<UserStore[]> {
    const { data, error } = await this.supabase
      .from('user_stores')
      .select(`
        *,
        store:stores (*)
      `)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .order('created_at', { ascending: false });

    if (error) {
      this.handleError(error, 'Get owned stores');
    }

    return data || [];
  }

  /**
   * Count users in a store
   */
  async countStoreUsers(storeId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('user_stores')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId);

    if (error) {
      this.handleError(error, 'Count store users');
    }

    return count || 0;
  }

  /**
   * Check if user is owner of store
   */
  async isOwner(userId: string, storeId: string): Promise<boolean> {
    const role = await this.getUserRole(userId, storeId);
    return role === 'owner';
  }

  /**
   * Check if user is employee of store
   */
  async isEmployee(userId: string, storeId: string): Promise<boolean> {
    const role = await this.getUserRole(userId, storeId);
    return role === 'employee';
  }
}

