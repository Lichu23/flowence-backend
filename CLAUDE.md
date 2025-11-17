# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flowence is a multi-tenant Point of Sale (POS) system for supermarket management built with Node.js/TypeScript and Express.js. The system supports multiple stores per owner with role-based access control, dual-stock inventory management, and payment integrations.

## Development Commands

### Build & Run
```bash
npm run dev              # Development server with nodemon (port 3002)
npm run build            # Compile TypeScript to dist/
npm start                # Production server (builds first)
npm run clean            # Remove dist/ folder
```

### Testing
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report (80% threshold required)
```

### Code Quality
```bash
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format with Prettier
npm run format:check     # Check formatting
```

### Database Management
```bash
npm run db:migrate       # Run all migrations
npm run db:seed          # Seed with sample data
npm run db:setup         # Migrate + seed
npm run db:clean         # Drop all tables
npm run db:reset         # Clean + setup
```

## Architecture Overview

### Layered Architecture Pattern
```
Routes → Controllers → Services → Models → Database (Supabase/PostgreSQL)
```

**Request Flow:**
1. **Routes** (`src/routes/`) - Define endpoints, attach middleware
2. **Controllers** (`src/controllers/`) - Handle HTTP, validate input with express-validator
3. **Services** (`src/services/`) - Business logic and orchestration
4. **Models** (`src/models/`) - Database operations via Supabase client
5. **Database** - PostgreSQL via Supabase (15 migrations in `src/database/migrations/`)

### Multi-Tenant Architecture

**Key Concept:** Users can access multiple stores, stores can have multiple users.

**Database Schema:**
- `users` - User accounts
- `stores` - Store entities (owner + settings)
- `user_stores` - Junction table (many-to-many with roles: 'owner' | 'employee')

**Per-store roles enforced via middleware:**
```typescript
requireStoreAccess()        // Any access
requireStoreAccess('owner') // Owner only
```

### Dual Stock System

Products have TWO stock locations:
- `stock_venta` - Sales floor stock
- `stock_deposito` - Warehouse/deposit stock

All inventory changes tracked in `stock_movements` table with type, quantity before/after, performer, and linked sale_id.

## Key Architectural Patterns

### Authentication & Authorization

**Two-Token JWT System:**
- Access token: 30 minutes, used for API requests
- Refresh token: 90 days, stored in DB, enables revocation

**Middleware Chain:**
```
Request → authenticate → requireStoreAccess(role?) → Controller
```

**Store Access Pattern:**
- `storeId` extracted from params/body/query
- Validated against `user_stores` table
- Role checked if specified ('owner' or 'employee')
- `storeId` and `storeRole` attached to request

### Payment Flow

**Sale Status Lifecycle:**
- `pending` - Created, stock NOT deducted (for card payments awaiting confirmation)
- `completed` - Payment confirmed, stock deducted
- `refunded` - Returned, stock restored (if return type is 'customer_mistake')

**Supported Gateways:** Stripe, MercadoPago (webhooks handle async confirmations)

### Return System

Advanced partial return support in `SaleService.processReturn()`:
- `customer_mistake` - Restores stock to original location
- `defective` - Doesn't restore (damaged goods)
- Prevents duplicate returns via stock_movements audit trail
- Auto-marks sale as `refunded` when fully returned

### BaseModel Pattern

All models extend `BaseModel` (`src/models/BaseModel.ts`):
- Provides `supabaseService.getAdminClient()` access
- Service role key bypasses Row Level Security (RLS)
- Custom permission checks in middleware layer

## API Structure

### Route Mounting (see `src/app.ts`)
```
/api/auth/*                      → AuthController
/api/stores/*                    → StoreController
/api/invitations/*               → InvitationController
/api/products/*                  → ProductController
/api/dashboard/*                 → DashboardController
/api/stock/*                     → StockController
/api/scanner/*                   → ScannerController
/api/sales/*                     → SalesController
/api/stores/:storeId/payments/*  → PaymentController
```

### Validation Pattern

Controllers use express-validator arrays:
```typescript
static validation = [
  body('field').trim().notEmpty(),
  // ... more rules
]

router.post('/', authenticate, requireStoreAccess(), Controller.validation, controller.method);
```

### Response Format

All responses use `ApiResponse<T>` type:
```typescript
{
  success: boolean,
  data?: T,
  message?: string,
  error?: { code: string, message: string, details?: any },
  timestamp: string
}
```

## Critical Database Migrations

1. **010_add_dual_stock_to_products.sql** - Adds stock_venta/stock_deposito
2. **011_create_sales.sql** - Enhanced sales with payment_status
3. **013_create_refresh_tokens.sql** - JWT refresh token storage
4. **014_add_store_settings.sql** - currency, tax_rate, low_stock_threshold
5. **015_add_sale_id_to_stock_movements.sql** - Links movements to sales for audit

## Configuration Management

**File:** `src/config/index.ts`

**Feature Flags Pattern:**
```typescript
features: {
  emailInvites: process.env.ENABLE_EMAIL_INVITES === 'true',
  stripePayments: process.env.ENABLE_STRIPE_PAYMENTS === 'true',
  // ...
}
```

**Security Config:**
- BCRYPT_ROUNDS: 12
- Rate limit: 100 req/15min (prod), 1000 req/15min (dev)
- JWT expiry: 30min access, 90 days refresh
- Trust proxy enabled (for ngrok/reverse proxy)

## Security Implementations

1. **Helmet** - Security headers (CSP, XSS, HSTS)
2. **CORS** - Configurable origin whitelist
3. **Rate Limiting** - express-rate-limit with X-Forwarded-For handling
4. **Password Requirements** - Min 8 chars, uppercase, lowercase, number, special char
5. **Input Validation** - express-validator on all endpoints
6. **SQL Injection Prevention** - Parameterized queries via Supabase
7. **Store Isolation** - Middleware enforces per-store access

## Testing Strategy

**Framework:** Jest with ts-jest

**Setup:** `src/test/setup.ts` - Global test utilities
- `generateRandomEmail()`
- `generateRandomString()`
- `generateRandomNumber()`

**Coverage Requirements:** 80% (branches, functions, lines, statements)

**Path Aliases:** `@/*` maps to `src/*` in tests

## Type System

**Custom Error Classes** (all extend `AppError`):
- `ValidationError` - 400
- `AuthenticationError` - 401
- `AuthorizationError` - 403
- `NotFoundError` - 404
- `ConflictError` - 409

**Request Augmentation:**
```typescript
interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  storeId?: string;
  storeRole?: 'owner' | 'employee';
}
```

## Important Business Logic

### Sale Processing (`SaleService.createSale`)
1. Validate products exist and have sufficient stock
2. Calculate subtotal, tax (store.tax_rate), discount
3. Generate receipt number: `REC-YYYY-NNNNNN`
4. For cash: Set status `completed`, deduct stock immediately
5. For card: Set status `pending`, deduct on webhook confirmation
6. Record stock_movements for each line item

### Employee Invitation Flow
1. Owner creates invitation with email + role (expires in 7 days)
2. Email sent via EmailService (Resend)
3. Invitee registers with invitation token
4. Auto-linked to store with specified role in `user_stores`

### Stock Transfer Pattern
Create stock_movement with type `'transfer'`:
- Deduct from `stock_deposito` OR `stock_venta`
- Add to opposite location
- Tracked in single movement record

## Deployment Configuration

**Platform Support:** Railway, Render

**Binding:** 0.0.0.0 (for platform port detection)

**Environment:** Set NODE_ENV to 'production' for:
- Strict rate limiting
- Disabled morgan logging
- Production error responses

## Common Development Patterns

### Adding a New Protected Route
1. Define route in `src/routes/[resource].ts`
2. Add validation array to controller method
3. Chain middleware: `authenticate`, `requireStoreAccess(role?)`
4. Controller extracts `req.user.userId`, `req.storeId`, `req.storeRole`

### Creating a New Service
1. Extend pattern in `src/services/`
2. Import models for database operations
3. Keep business logic here, NOT in controllers
4. Return structured data, throw custom errors

### Adding Database Migration
1. Create numbered SQL file in `src/database/migrations/`
2. Follow naming: `NNN_description.sql`
3. Run `npm run db:migrate` to apply
4. Update relevant model in `src/models/`

### Working with Stock
Always create stock_movements when changing inventory:
```typescript
await StockMovementModel.create({
  product_id,
  quantity_before,
  quantity_after,
  quantity_changed: Math.abs(quantity_after - quantity_before),
  movement_type: 'sale' | 'return' | 'adjustment' | 'transfer',
  stock_type: 'venta' | 'deposito',
  reason: 'Description',
  performed_by: userId,
  sale_id: saleId // If applicable
});
```
