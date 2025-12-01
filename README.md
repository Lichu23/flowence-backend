# Flowence Server

Backend API for Flowence - A comprehensive multi-tenant Point of Sale (POS) system for supermarket management built with Node.js, TypeScript, and Express.js.

## Overview

Flowence is a production-ready POS system that supports multiple stores per owner with role-based access control, dual-stock inventory management (warehouse + sales floor), advanced returns processing, payment gateway integrations, and comprehensive audit trails.

## Features

### Core Features
- **Multi-Tenant Architecture**: Users can own multiple stores, stores can have multiple users (owners + employees)
- **Advanced Authentication**: JWT-based auth with access tokens (30m) and refresh tokens (90d), token revocation support
- **Role-Based Access Control**: Owner and employee roles with store-specific permissions
- **Dual Stock System**: Separate tracking for warehouse (deposito) and sales floor (venta) inventory
- **Complete POS**: Full point-of-sale with cash, card, and mixed payments
- **Advanced Returns**: Partial returns, return types (customer mistake/defective), stock restoration
- **Payment Integrations**: Stripe and Mercado Pago with webhook support
- **Receipt Generation**: PDF receipts with barcode support and customizable formatting
- **Email Invitations**: Employee invitation system with HTML email templates
- **Dashboard Analytics**: Revenue tracking, inventory stats, low stock alerts across all stores
- **Audit Trail**: Complete stock movement history with user tracking
- **Currency Conversion**: Multi-currency support with real-time exchange rates
- **Thermal Printer Support**: Print job queue with retry mechanism

### Security Features
- JWT authentication with refresh token rotation
- Bcrypt password hashing (12 rounds)
- Password requirements enforcement (8+ chars, uppercase, lowercase, number, special char)
- Rate limiting (configurable per environment)
- CORS with whitelist configuration
- Helmet security headers (CSP, XSS, HSTS)
- Input validation on all endpoints (express-validator)
- SQL injection prevention via parameterized queries
- Store-level data isolation
- Row Level Security (RLS) on critical tables

## Tech Stack

- **Runtime**: Node.js with TypeScript 5.9.3
- **Framework**: Express.js 5.1.0
- **Database**: PostgreSQL via Supabase (@supabase/supabase-js 2.38.4)
- **Authentication**: JWT (jsonwebtoken 9.0.2) + bcryptjs 3.0.2
- **Payment Gateways**: Stripe 19.1.0, Mercado Pago (custom integration)
- **Email Service**: Resend 4.8.0
- **PDF Generation**: pdfkit 0.17.2 with bwip-js 3.2.0 for barcodes
- **Security**: helmet 8.1.0, cors 2.8.5, express-rate-limit 8.0.1
- **Validation**: express-validator 7.2.1
- **Testing**: Jest 30.2.0 with ts-jest 29.4.4 and supertest 7.1.4
- **Code Quality**: ESLint 8.57.1, Prettier 3.6.2
- **Dev Server**: nodemon 3.1.10

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account (for PostgreSQL database)
- Optional: Stripe account (for card payments)
- Optional: Mercado Pago account (for QR payments)
- Optional: Resend account (for email invitations)

### Installation

1. Clone the repository and navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
```

4. Configure your `.env` file (see Environment Variables section below)

5. Set up the database:
```bash
# Run all migrations
npm run db:migrate

# Optional: Seed with sample data
npm run db:seed

# Or do both at once
npm run db:setup
```

### Development

Start the development server with hot reload:
```bash
npm run dev
```

The server will start on `http://localhost:3002` (or the PORT specified in your .env)

### Production

Build and start the production server:
```bash
npm start
```

Or build separately:
```bash
npm run build
npm run start
```

## Available Scripts

### Build & Run
- `npm run dev` - Start development server with nodemon (port 3002)
- `npm run build` - Compile TypeScript to dist/
- `npm start` - Build and start production server
- `npm run clean` - Remove dist/ folder

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report (80% threshold required)

### Code Quality
- `npm run lint` - Run ESLint check
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Database Management
- `npm run db:migrate` - Run all migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:setup` - Run migrations + seed
- `npm run db:clean` - Drop all tables
- `npm run db:reset` - Clean + setup (full reset)

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns access + refresh tokens)
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout and revoke refresh token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/me` - Get current user profile (protected)
- `POST /api/auth/change-password` - Change password (protected)

### Store Management (`/api/stores`)
- `GET /api/stores` - Get all user's stores
- `POST /api/stores` - Create new store
- `GET /api/stores/:id` - Get store by ID
- `PUT /api/stores/:id` - Update store (owner only)
- `DELETE /api/stores/:id` - Delete store (owner only)
- `GET /api/stores/:id/users` - Get store users
- `GET /api/stores/:id/stats` - Get store statistics

#### Currency Conversion
- `GET /api/stores/exchange-rate/:from/:to` - Get exchange rate
- `POST /api/stores/convert-amount` - Convert currency amount
- `GET /api/stores/supported-currencies` - List supported currencies
- `POST /api/stores/:id/preview-conversion` - Preview currency conversion
- `POST /api/stores/:id/convert-products` - Convert products to new currency
- `POST /api/stores/:id/convert-sales` - Convert sales to new currency

### Product Management (`/api/stores/:storeId/products`)
- `POST /api/stores/:storeId/products` - Create product (owner only)
- `GET /api/stores/:storeId/products` - Get products (pagination, filters)
- `GET /api/stores/:storeId/products/categories` - Get all categories
- `GET /api/stores/:storeId/products/barcode/:barcode` - Get product by barcode
- `GET /api/stores/:storeId/products/:id` - Get product by ID
- `PUT /api/stores/:storeId/products/:id` - Update product (owner only)
- `POST /api/stores/:storeId/products/:id/adjust-stock` - Adjust stock levels (owner only)
- `DELETE /api/stores/:storeId/products/:id` - Delete product (owner only)

### Stock Management (`/api/stores/:storeId`)
- `POST /api/stores/:storeId/products/:productId/restock` - Move stock from warehouse to sales floor
- `POST /api/stores/:storeId/products/:productId/stock/warehouse/fill` - Fill warehouse stock (owner only)
- `PUT /api/stores/:storeId/products/:productId/stock/sales/update` - Update sales floor stock
- `PUT /api/stores/:storeId/products/:productId/stock/warehouse` - Adjust warehouse stock
- `PUT /api/stores/:storeId/products/:productId/stock/sales` - Adjust sales floor stock
- `GET /api/stores/:storeId/products/:productId/stock/movements` - Get stock movement history
- `GET /api/stores/:storeId/stock/alerts` - Get low stock alerts

### Scanner/Barcode (`/api/stores/:storeId`)
- `GET /api/stores/:storeId/products/search/barcode/:code` - Search product by barcode
- `GET /api/stores/:storeId/products/barcode/:code/validate` - Validate barcode uniqueness
- `GET /api/stores/:storeId/scanner/stats` - Get scanner statistics

### Sales/POS (`/api/stores/:storeId/sales`)
- `POST /api/stores/:storeId/sales` - Process new sale
- `GET /api/stores/:storeId/sales` - List sales with pagination
- `GET /api/stores/:storeId/sales/search/ticket` - Search sale by ticket number
- `GET /api/stores/:storeId/sales/:saleId` - Get sale details
- `GET /api/stores/:storeId/sales/:saleId/receipt` - Download receipt PDF
- `POST /api/stores/:storeId/sales/:saleId/refund` - Refund entire sale
- `GET /api/stores/:storeId/sales/:saleId/returns-summary` - Get returns summary
- `POST /api/stores/:storeId/sales/:saleId/returns-batch` - Process partial returns
- `GET /api/stores/:storeId/sales/:saleId/returned-products` - Get returned products list

### Payment Integration (`/api/stores/:storeId/payments`)
- `POST /api/stores/:storeId/payments/intents` - Create Stripe payment intent
- `POST /api/stores/:storeId/payments/confirm` - Confirm payment
- `GET /api/stores/:storeId/payments/:paymentIntentId/status` - Get payment status
- `POST /api/stores/:storeId/payments/mercado-pago/qr-order` - Create Mercado Pago QR order
- `DELETE /api/stores/:storeId/payments/mercado-pago/qr-order` - Cancel Mercado Pago QR order
- `POST /api/stores/webhooks/mercado-pago` - Mercado Pago webhook (no auth)

### Invitations (`/api/invitations`)
- `POST /api/invitations` - Send invitation (owner only)
- `GET /api/invitations/validate/:token` - Validate invitation token (public)
- `POST /api/invitations/accept` - Accept invitation and create account (public)
- `GET /api/invitations/store/:storeId` - Get all store invitations
- `GET /api/invitations/store/:storeId/pending` - Get pending invitations
- `GET /api/invitations/store/:storeId/stats` - Get invitation statistics
- `POST /api/invitations/:id/revoke` - Revoke invitation
- `POST /api/invitations/:id/resend` - Resend invitation email

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard/stats/:storeId` - Get dashboard statistics
- `GET /api/dashboard/stores-inventory` - Get inventory stats for all owned stores
- `GET /api/dashboard/defective-products/:storeId` - Get defective products list
- `GET /api/dashboard/global-summary` - Get global summary across all stores (owner only)

### Utility
- `GET /health` - Server health check
- `GET /api` - API information and version

## Project Structure

```
src/
├── config/              # Configuration files (index.ts)
├── controllers/         # Route controllers (8+ controllers)
├── middleware/          # Custom middleware (auth, storeAccess, validation)
├── models/              # Database models with Supabase client
├── routes/              # API route definitions (8 route modules)
├── services/            # Business logic layer (16+ services)
│   ├── SaleService.ts           # Sales & returns processing
│   ├── ProductService.ts        # Product management
│   ├── StockService.ts          # Stock operations
│   ├── PaymentService.ts        # Stripe integration
│   ├── MercadoPagoService.ts    # Mercado Pago integration
│   ├── EmailService.ts          # Resend email
│   ├── ReceiptService.ts        # PDF generation
│   ├── PrintService.ts          # Thermal printer
│   └── ...
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── database/
│   ├── migrations/      # Database migrations (15 migrations)
│   └── seeds/           # Seed data
├── test/                # Test files and setup
├── app.ts               # Express app configuration
└── server.ts            # Server entry point
```

## Database Schema

### Core Tables

- **users** - User accounts (email, password_hash, name, role)
- **stores** - Store entities (owner_id, name, address, currency, tax_rate, settings)
- **user_stores** - Many-to-many junction (user_id, store_id, role)
- **products** - Product catalog with dual stock system:
  - `stock_deposito` - Warehouse inventory
  - `stock_venta` - Sales floor inventory
  - `stock` - Legacy field (auto-calculated)
- **sales** - Sales transactions (receipt_number, payment_method, payment_status)
- **sale_items** - Line items for each sale
- **stock_movements** - Audit trail for all inventory changes
- **invitations** - Employee invitation system
- **refresh_tokens** - JWT refresh token storage with revocation
- **print_jobs** - Thermal printer queue
- **print_job_logs** - Print job audit trail

### Key Relationships

- Users ↔ Stores (many-to-many via user_stores)
- Stores → Products (one-to-many)
- Sales → Sale Items (one-to-many)
- Sales ↔ Stock Movements (for audit trail)
- Products ↔ Stock Movements (for inventory tracking)

## Architecture

### Layered Architecture Pattern

```
Request Flow:
Routes → Middleware → Controllers → Services → Models → Database (Supabase)
```

### Multi-Tenant Design

- Users can access multiple stores
- Stores can have multiple users with different roles
- Store-level permissions enforced via middleware
- Complete data isolation per store

### Middleware Chain

```typescript
Request → authenticate → requireStoreAccess(role?) → Controller
```

- `authenticate`: Validates JWT, attaches user to request
- `requireStoreAccess()`: Validates any store access
- `requireStoreAccess('owner')`: Validates owner-only access
- Store context attached: `req.storeId`, `req.storeRole`

### Dual Stock System

Each product has two stock locations:
- **stock_deposito**: Warehouse/storage inventory
- **stock_venta**: Sales floor inventory

All stock operations are tracked in `stock_movements` table with:
- Movement type (restock/adjustment/sale/return/transfer)
- Quantity before/after
- User who performed action
- Linked sale_id (for sales/returns)
- Reason and notes

### Sale Processing Flow

1. Validate products and stock availability
2. Calculate subtotal, tax (from store settings), discount
3. Generate receipt number: `REC-YYYY-NNNNNN`
4. Create sale record
5. For cash/card: Set status `completed`, deduct stock immediately
6. For payment gateways: Set status `pending`, deduct on webhook confirmation
7. Record stock movements for audit trail

### Return Processing

- **Partial Returns**: Return specific quantities of items
- **Return Types**:
  - `customer_mistake`: Restores stock to original location
  - `defective`: Does not restore stock (damaged goods)
- Duplicate return prevention via stock movements audit
- Auto-marks sale as `refunded` when fully returned

## Environment Variables

### Required Variables

```env
# Supabase (Required)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT (Required)
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars
JWT_EXPIRES_IN=30m
REFRESH_TOKEN_EXPIRES_IN=90d
```

### Optional Variables

```env
# Server
PORT=3002
HOST=0.0.0.0
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# Email (Resend)
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Flowence

# Stripe (Optional)
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Mercado Pago (Optional)
MERCADO_PAGO_ACCESS_TOKEN=your_access_token
MERCADO_PAGO_WEBHOOK_SECRET=your_webhook_secret
MERCADO_PAGO_QR_COLLECTOR_ID=your_collector_id
MERCADO_PAGO_QR_POS_ID=your_pos_id

# Print Service (Optional)
PRINT_SERVICE_URL=http://localhost:3001
PRINT_SERVICE_API_KEY=your_api_key
PRINT_SERVICE_TIMEOUT=30000
PRINT_SERVICE_MAX_RETRIES=3

# Feature Flags
ENABLE_EMAIL_INVITES=true
ENABLE_STRIPE_PAYMENTS=false
ENABLE_MERCADO_PAGO=false
ENABLE_THERMAL_PRINTER=false
ENABLE_BARCODE_SCANNER=true
```

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage report
npm run test:coverage
```

### Test Configuration

- **Framework**: Jest with ts-jest
- **Coverage Threshold**: 80% (branches, functions, lines, statements)
- **Test Timeout**: 10 seconds
- **Path Aliases**: `@/*` maps to `src/*`

### Test Utilities

Global test helpers in `src/test/setup.ts`:
- `generateRandomEmail()`
- `generateRandomString()`
- `generateRandomNumber()`

## Deployment

### Supported Platforms

- Railway
- Render
- Any platform supporting Node.js + PostgreSQL

### Deployment Configuration

1. Set `NODE_ENV=production`
2. Configure all required environment variables
3. Ensure `HOST=0.0.0.0` for platform port detection
4. Run migrations: `npm run db:migrate`
5. Start server: `npm start`

### Production Considerations

- Strict rate limiting enabled (100 req/15min)
- Error responses sanitized
- CORS whitelist enforced
- Trust proxy enabled (for reverse proxies)
- HTTPS upgrade enforcement via Helmet

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **JWT Secret**: Use strong, random 32+ character secret
3. **CORS**: Configure allowed origins for production
4. **Rate Limiting**: Adjust based on your traffic patterns
5. **Database**: Use Row Level Security (RLS) policies
6. **Passwords**: Enforce strong password requirements
7. **HTTPS**: Always use HTTPS in production
8. **Webhook Secrets**: Verify webhook signatures
9. **Token Revocation**: Implement logout to revoke refresh tokens

## Supported Currencies

USD, EUR, GBP, ARS (Argentine Peso), MXN (Mexican Peso), CAD, AUD, JPY

Real-time exchange rates with conversion support for products and historical sales.

## Contributing

1. Follow coding standards defined in ESLint and Prettier
2. Write tests for new features (maintain 80% coverage)
3. Update documentation as needed
4. Follow commit message conventions (conventional commits)
5. Test locally before pushing
6. Ensure all tests pass: `npm test`
7. Check code quality: `npm run lint && npm run format:check`

## License

MIT License - see LICENSE file for details

## Project Statistics

- **Total TypeScript Code**: ~13,500 lines
- **Database Migrations**: 15 migrations
- **Service Classes**: 16+ services
- **API Routes**: 8 route modules
- **Controllers**: 8+ controllers
- **Test Coverage**: 80% minimum required

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.

---

**Built with** Node.js, TypeScript, Express.js, PostgreSQL (Supabase), and lots of ☕
