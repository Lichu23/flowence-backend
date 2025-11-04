import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

// 404 Not Found handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  // Suppress unused parameter warning
  void next;
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND_ERROR',
      message: `Route ${req.method} ${req.originalUrl} not found`
    },
    timestamp: new Date().toISOString()
  };

  res.status(404).json(response);
};
