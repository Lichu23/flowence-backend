import { Request } from 'express';
import { User } from './user';
// import { Store } from './store';
// import { Product } from './product';
// import { Sale } from './sale';

// Extend Express Request interface to include user
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationInfo;
}

// Note: LoginRequest, RegisterRequest, and AuthResponse are defined in user.ts
// Kept here for backwards compatibility
export type LoginRequest = import('./user').LoginCredentials;
export type RegisterRequest = import('./user').RegisterData;

export interface RefreshTokenRequest {
  refreshToken: string;
}

// User types
export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: 'owner' | 'employee';
  storeId?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: 'owner' | 'employee';
}

// Store types
export interface CreateStoreRequest {
  name: string;
  address?: string;
  phone?: string;
  currency?: string;
  taxRate?: number;
  lowStockThreshold?: number;
}

export interface UpdateStoreRequest {
  name?: string;
  address?: string;
  phone?: string;
  currency?: string;
  taxRate?: number;
  lowStockThreshold?: number;
}

// Product types
export interface CreateProductRequest {
  name: string;
  barcode?: string;
  price: number;
  cost: number;
  stock: number;
  category?: string;
  description?: string;
}

export interface UpdateProductRequest {
  name?: string;
  barcode?: string;
  price?: number;
  cost?: number;
  stock?: number;
  category?: string;
  description?: string;
}

export interface ProductSearchParams {
  query?: string;
  category?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'price' | 'stock' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// Sale types
export interface CreateSaleRequest {
  items: SaleItem[];
  paymentMethod: 'cash' | 'card';
  amountReceived?: number;
}

export interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface SaleSearchParams {
  startDate?: string;
  endDate?: string;
  paymentMethod?: 'cash' | 'card';
  userId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'totalAmount';
  sortOrder?: 'asc' | 'desc';
}

// Invitation types
export interface CreateInvitationRequest {
  email: string;
  role: 'employee';
  message?: string;
}

export interface InvitationResponse {
  invitationId: string;
  email: string;
  role: string;
  expiresAt: Date;
  message?: string;
}

// Error types
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly details: any;

  constructor(message: string, details: any = {}) {
    super(message, 400);
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

// Database types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  url: string;
}

// JWT types
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  storeId: string;
  type?: 'access' | 'refresh';
}

// File upload types
export interface FileUploadConfig {
  maxFileSize: number;
  uploadPath: string;
  allowedMimeTypes?: string[];
}

// Email types
export interface EmailConfig {
  sendgridApiKey: string;
  fromEmail: string;
  enabled: boolean;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Payment types
export interface PaymentConfig {
  stripeSecretKey: string;
  stripePublishableKey: string;
  stripeWebhookSecret: string;
  enabled: boolean;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

// Export all types
export * from './user';
export * from './store';
export * from './product';
export * from './sale';
