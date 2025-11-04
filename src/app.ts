import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { ApiResponse } from './types';

// Import routes
import authRoutes from './routes/auth';
import storeRoutes from './routes/stores';
import invitationRoutes from './routes/invitations';
import productRoutes from './routes/products';
import dashboardRoutes from './routes/dashboard';
import stockRoutes from './routes/stock';
import scannerRoutes from './routes/scanner';
import salesRoutes from './routes/sales';
import paymentRoutes from './routes/payments';

const app: Application = express();

// Trust proxy for ngrok and other reverse proxies
app.set('trust proxy', true);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ['\'self\''],
        styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
        fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
        imgSrc: ['\'self\'', 'data:', 'https:'],
        scriptSrc: ['\'self\''],
        connectSrc: ['\'self\''],
        frameSrc: ['\'none\''],
        objectSrc: ['\'none\''],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  })
);

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Get the client IP, handling X-Forwarded-For from proxies like ngrok
const getClientIp = (req: Request): string => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  
  // Handle X-Forwarded-For header
  if (xForwardedFor) {
    // Get the first address if it's an array, otherwise use the value directly
    const firstAddress = Array.isArray(xForwardedFor) 
      ? xForwardedFor[0] 
      : xForwardedFor;
    
    if (firstAddress) {
      // Convert to string and safely get the first part before any comma
      const addressStr = String(firstAddress);
      const firstCommaIndex = addressStr.indexOf(',');
      const firstIp = firstCommaIndex >= 0 
        ? addressStr.substring(0, firstCommaIndex).trim()
        : addressStr.trim();
      
      if (firstIp) {
        return firstIp;
      }
    }
  }
  
  // Fall back to socket remote address
  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }
  
  // Last resort fallback
  return 'unknown-ip';
};

// Rate limiting (more permissive in development)
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.server.nodeEnv === 'development' 
    ? 1000 // 1000 requests per window in development
    : config.security.rateLimitMaxRequests, // 100 requests per window in production
  keyGenerator: (req) => getClientIp(req as Request),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later'
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check in development
    return config.server.nodeEnv === 'development' && req.path === '/health';
  }
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.server.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestTime = new Date().toISOString();
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.server.nodeEnv,
      version: config.server.appVersion
    },
    message: 'Server is running',
    timestamp: new Date().toISOString()
  };

  res.status(200).json(response);
});

// API routes
app.get('/api', (_req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      name: config.server.appName,
      version: config.server.appVersion,
      description: config.server.appDescription,
      environment: config.server.nodeEnv,
      timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          auth: '/api/auth/*',
          stores: '/api/stores/*',
          invitations: '/api/invitations/*',
          products: '/api/products/*',
          dashboard: '/api/dashboard/*',
          stock: '/api/stock/*',
          api: '/api'
        }
    },
    message: 'Welcome to Flowence API',
    timestamp: new Date().toISOString()
  };

  res.status(200).json(response);
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api', productRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', stockRoutes);
app.use('/api', scannerRoutes);
app.use('/api', salesRoutes);
app.use('/api/stores', paymentRoutes);

// Debug: Log all registered routes
console.log('🔧 Registered payment routes:');
console.log('  POST /api/stores/webhooks/mercado-pago (webhook - no auth)');
console.log('  POST /api/stores/:storeId/payments/intents');
console.log('  POST /api/stores/:storeId/payments/confirm');

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;