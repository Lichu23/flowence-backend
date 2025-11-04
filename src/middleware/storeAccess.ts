/**
 * Store Access Middleware
 * Validates user access to stores in multi-store architecture
 */

import { Request, Response, NextFunction } from 'express';
import { UserStoreModel } from '../models/UserStoreModel';
import { ApiResponse } from '../types';

const userStoreModel = new UserStoreModel();

/**
 * Extract store_id from request
 * Checks body, query, and params (both snake_case and camelCase)
 */
function extractStoreId(req: Request): string | null {
  return (
    req.body?.['store_id'] || 
    req.query?.['store_id'] || 
    req.params?.['store_id'] || 
    req.params?.['storeId'] ||  // Support camelCase from route params
    req.params?.['id']
  );
}

/**
 * Validate Store Access Middleware
 * Ensures user has access to the requested store
 */
export const validateStoreAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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

    const storeId = extractStoreId(req);

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

    // Check if user has access to this store
    const hasAccess = await userStoreModel.hasAccess(userId, storeId);

    if (!hasAccess) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this store'
        },
        timestamp: new Date().toISOString()
      };
      res.status(403).json(response);
      return;
    }

    // Get user's role in this store
    const role = await userStoreModel.getUserRole(userId, storeId);

    // Attach store context to request
    (req as any).storeId = storeId;
    (req as any).storeRole = role;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require Store Owner Middleware
 * Ensures user is owner of the store
 */
export const requireStoreOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storeRole = (req as any).storeRole;

    if (storeRole !== 'owner') {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only store owners can perform this action'
        },
        timestamp: new Date().toISOString()
      };
      res.status(403).json(response);
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Attach Store Context Middleware
 * Adds store information to request without validation
 * Use this for optional store filtering
 */
export const attachStoreContext = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storeId = extractStoreId(req);
    
    if (storeId) {
      (req as any).storeId = storeId;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate Store Ownership Middleware
 * For operations that require direct store ownership (not just access)
 */
export const validateStoreOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const storeId = extractStoreId(req);

    if (!userId || !storeId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'User ID and Store ID are required'
        },
        timestamp: new Date().toISOString()
      };
      res.status(400).json(response);
      return;
    }

    const isOwner = await userStoreModel.isOwner(userId, storeId);

    if (!isOwner) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You must be the store owner to perform this action'
        },
        timestamp: new Date().toISOString()
      };
      res.status(403).json(response);
      return;
    }

    // Attach ownership context
    (req as any).storeId = storeId;
    (req as any).storeRole = 'owner';
    (req as any).isStoreOwner = true;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Combined Store Access and Role Validation Middleware
 * Validates store access and optionally checks for specific role
 * 
 * @param requiredRole - Optional role requirement ('owner', 'employee', or undefined for any access)
 */
export const requireStoreAccess = (requiredRole?: 'owner' | 'employee') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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

      const storeId = extractStoreId(req);

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

      // Check if user has access to this store
      const hasAccess = await userStoreModel.hasAccess(userId, storeId);

      if (!hasAccess) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this store'
          },
          timestamp: new Date().toISOString()
        };
        res.status(403).json(response);
        return;
      }

      // Get user's role in this store
      const role = await userStoreModel.getUserRole(userId, storeId);

      // Check role requirement if specified
      if (requiredRole && role !== requiredRole) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Only ${requiredRole}s can perform this action`
          },
          timestamp: new Date().toISOString()
        };
        res.status(403).json(response);
        return;
      }

      // Attach store context to request
      (req as any).storeId = storeId;
      (req as any).storeRole = role;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Log Store Access Middleware
 * Logs all store access attempts for audit purposes
 */
export const logStoreAccess = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const storeId = (req as any).storeId;
    const method = req.method;
    const path = req.path;

    if (userId && storeId) {
      console.log(`[Store Access] User: ${userId}, Store: ${storeId}, ${method} ${path}`);
      // TODO: Add to proper audit log system
    }

    next();
  } catch (error) {
    next(error);
  }
};

