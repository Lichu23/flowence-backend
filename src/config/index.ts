import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Server configuration
export const serverConfig = {
  port: parseInt(process.env['PORT'] || '3002', 10),
  host: process.env['HOST'] || '0.0.0.0',
  nodeEnv: process.env['NODE_ENV'] || 'development',
  appName: process.env['APP_NAME'] || 'Flowence',
  appVersion: process.env['APP_VERSION'] || '1.0.0',
  appDescription: process.env['APP_DESCRIPTION'] || 'All-in-one supermarket management system'
};

// Supabase configuration
export const supabaseConfig = {
  url: process.env['SUPABASE_URL']!,
  anonKey: process.env['SUPABASE_ANON_KEY']!,
  serviceRoleKey: process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  projectId: process.env['SUPABASE_PROJECT_ID']!,
  region: process.env['SUPABASE_REGION'] || 'us-east-1',
  databaseUrl: process.env['SUPABASE_DATABASE_URL']
};

// JWT configuration
export const jwtConfig = {
  secret: process.env['JWT_SECRET'] || 'default-jwt-secret-change-in-production',
  expiresIn: process.env['JWT_EXPIRES_IN'] || '30m',
  refreshExpiresIn: process.env['REFRESH_TOKEN_EXPIRES_IN'] || '7d'
};

// Security configuration
export const securityConfig = {
  bcryptRounds: parseInt(process.env['BCRYPT_ROUNDS'] || '12', 10),
  rateLimitWindowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10)
};

// CORS configuration
export const corsConfig = {
  origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  credentials: process.env['CORS_CREDENTIALS'] === 'true'
};

// Logging configuration
export const loggingConfig = {
  level: process.env['LOG_LEVEL'] || 'info',
  file: process.env['LOG_FILE'] || 'logs/app.log'
};

// Feature flags
export const featureFlags = {
  emailInvites: process.env['ENABLE_EMAIL_INVITES'] === 'true',
  stripePayments: process.env['ENABLE_STRIPE_PAYMENTS'] === 'true',
  barcodeScanner: process.env['ENABLE_BARCODE_SCANNER'] === 'true',
  pwa: process.env['ENABLE_PWA'] === 'true'
};

// Development tools
export const devToolsConfig = {
  swagger: process.env['ENABLE_SWAGGER'] === 'true',
  graphqlPlayground: process.env['ENABLE_GRAPHQL_PLAYGROUND'] === 'true'
};

const config = {
  server: serverConfig,
  supabase: supabaseConfig,
  jwt: jwtConfig,
  security: securityConfig,
  cors: corsConfig,
  logging: loggingConfig,
  features: featureFlags,
  devTools: devToolsConfig
};

export { config };
export default config;