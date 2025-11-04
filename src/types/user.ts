/**
 * User Types (Multi-Store Architecture)
 */

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'owner' | 'employee';
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: 'owner' | 'employee';
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  role?: 'owner' | 'employee';
}

export interface UserWithStores extends User {
  stores: Array<{
    id: string;
    name: string;
    role: 'owner' | 'employee';
  }>;
}

export interface UserProfile extends Omit<User, 'password_hash'> {
  stores: Array<{
    id: string;
    name: string;
    address?: string;
    phone?: string;
    role: 'owner' | 'employee';
  }>;
}

export interface UserStats {
  total_sales: number;
  total_revenue: number;
  average_sale_amount: number;
  last_sale_date?: string;
}

export interface UserInvitation {
  id: string;
  store_id: string;
  email: string;
  role: 'employee' | 'owner';
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invited_by: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  last_accessed_at: string;
  ip_address?: string;
  user_agent?: string;
}

// Authentication related types
export interface AuthResponse {
  user: UserProfile;
  token: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  store_name: string; // First store name
  store_address?: string; // First store address (optional)
  store_phone?: string; // First store phone (optional)
}
