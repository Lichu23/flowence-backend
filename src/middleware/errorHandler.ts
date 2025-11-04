import { Request, Response, NextFunction } from 'express';
import config from '../config';
import { AppError, ApiResponse } from '../types';

// Custom error handler
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Suppress unused parameter warning
  void next;
  let statusCode = 500;
  let message = 'An internal error occurred';
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  // Handle known error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;

    // Set appropriate error codes
    if (statusCode === 400) code = 'VALIDATION_ERROR';
    else if (statusCode === 401) code = 'AUTHENTICATION_ERROR';
    else if (statusCode === 403) code = 'AUTHORIZATION_ERROR';
    else if (statusCode === 404) code = 'NOT_FOUND_ERROR';
    else if (statusCode === 409) code = 'CONFLICT_ERROR';
    else if (statusCode === 429) code = 'RATE_LIMIT_ERROR';
    else code = 'APPLICATION_ERROR';

    // Add validation details if available
    if (error instanceof Error && 'details' in error) {
      details = (error as any).details;
    }
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
    code = 'INVALID_FORMAT_ERROR';
  } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
    statusCode = 500;
    message = 'Database error';
    code = 'DATABASE_ERROR';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN_ERROR';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED_ERROR';
  }

  // Log error in development
  if (config.server.nodeEnv === 'development') {
    console.error('Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  // Log error in production (you might want to use a proper logging service)
  if (config.server.nodeEnv === 'production') {
    console.error('Production Error:', {
      name: error.name,
      message: error.message,
      url: req.url,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
  }

  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    },
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(response);
};
