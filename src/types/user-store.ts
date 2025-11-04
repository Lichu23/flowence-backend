/**
 * User-Store Types
 * Types for many-to-many relationship between users and stores
 */

import { Store } from './store';
import { User } from './user';

export interface UserStore {
  id: string;
  user_id: string;
  store_id: string;
  role: 'owner' | 'employee';
  created_at: string;
  
  // Joined data (optional)
  user?: User;
  store?: Store;
}

export interface CreateUserStoreData {
  user_id: string;
  store_id: string;
  role: 'owner' | 'employee';
}

export interface UpdateUserStoreData {
  role?: 'owner' | 'employee';
}

export interface UserStoreWithDetails extends UserStore {
  user: User;
  store: Store;
}

