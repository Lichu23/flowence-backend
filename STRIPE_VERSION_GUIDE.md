# Stripe API Version Configuration Guide

## Overview

This guide explains how to use different Stripe API versions in local development vs. production environments.

## Problem Solved

- **Local Development**: Uses Stripe API version `2025-09-30.clover`
- **Production**: Uses Stripe API version `2025-10-29.clover`

The solution uses environment variables to configure the Stripe API version dynamically.

## Configuration

### Environment Variable

Add the following to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_API_VERSION=2025-09-30.clover
```

### Local Development (.env)

```env
# Use the older API version for local development
STRIPE_API_VERSION=2025-09-30.clover
```

### Production Environment

Set the environment variable in your production deployment:

```env
# Use the newer API version in production
STRIPE_API_VERSION=2025-10-29.clover
```

## How It Works

### 1. Configuration File (`src/config/index.ts`)

The Stripe configuration is centralized:

```typescript
export const stripeConfig = {
  secretKey: process.env['STRIPE_SECRET_KEY']!,
  publishableKey: process.env['STRIPE_PUBLISHABLE_KEY'],
  webhookSecret: process.env['STRIPE_WEBHOOK_SECRET'],
  apiVersion: (process.env['STRIPE_API_VERSION'] || '2025-09-30.clover') as any
};
```

**Default**: If `STRIPE_API_VERSION` is not set, it defaults to `2025-09-30.clover`

### 2. Payment Service (`src/services/PaymentService.ts`)

The PaymentService uses the configuration:

```typescript
import config from '../config';

export class PaymentService {
  private stripe: Stripe;

  constructor() {
    if (!config.stripe.secretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY');
    }
    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: config.stripe.apiVersion,  // ← Uses env variable
      typescript: true
    });
  }
}
```

## Deployment Instructions

### Railway / Render / Vercel

1. Go to your project's environment variables settings
2. Add the following variable:
   ```
   STRIPE_API_VERSION=2025-10-29.clover
   ```
3. Redeploy your application

### Docker

In your `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - STRIPE_API_VERSION=2025-10-29.clover
```

Or in `Dockerfile` with build args:

```dockerfile
ENV STRIPE_API_VERSION=2025-10-29.clover
```

### Heroku

```bash
heroku config:set STRIPE_API_VERSION=2025-10-29.clover
```

### AWS / Google Cloud / Azure

Set the environment variable through your cloud provider's console or CLI.

## Package Version

The Stripe npm package has been updated to support both API versions:

```json
{
  "dependencies": {
    "stripe": "^20.0.0"
  }
}
```

**Note**: Stripe package version `20.0.0` supports multiple API versions through configuration.

## Testing

### Local Testing

1. Ensure your `.env` file has:
   ```env
   STRIPE_API_VERSION=2025-09-30.clover
   ```

2. Run the server:
   ```bash
   npm run dev
   ```

3. Verify in logs that Stripe is initialized with the correct version

### Production Testing

1. Set the production environment variable:
   ```env
   STRIPE_API_VERSION=2025-10-29.clover
   ```

2. Deploy and check logs for Stripe initialization

3. Test payment flows to ensure compatibility

## Verification

You can verify which API version is being used by checking the Stripe dashboard:
- Go to: **Developers** → **Webhooks** → Check the API version on webhook events
- Or check your server logs during Stripe client initialization

## Troubleshooting

### Error: Type 'X' is not assignable to type 'Y'

This means the Stripe package doesn't support the API version you specified.

**Solution**:
1. Check the installed Stripe package version: `npm list stripe`
2. Ensure you're using `stripe@20.0.0` or higher
3. Verify the API version string is correct

### Stripe API Version Not Changing

**Solution**:
1. Verify the environment variable is set correctly
2. Restart your server after changing the `.env` file
3. Check if the config is being imported correctly

### Build Errors

If you get TypeScript errors about Stripe API versions:

1. Make sure you're using the latest Stripe package:
   ```bash
   npm install stripe@latest
   ```

2. The `as any` cast in the config allows flexibility:
   ```typescript
   apiVersion: (process.env['STRIPE_API_VERSION'] || '2025-09-30.clover') as any
   ```

## Migration Notes

### From Hardcoded to Environment Variable

**Before**:
```typescript
this.stripe = new Stripe(apiKey, {
  apiVersion: '2025-09-30.clover',  // Hardcoded
  typescript: true
});
```

**After**:
```typescript
this.stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: config.stripe.apiVersion,  // From environment
  typescript: true
});
```

## Best Practices

1. **Always set `STRIPE_API_VERSION` in production** - Don't rely on the default
2. **Test with production API version** before deploying
3. **Document which version is used** in each environment
4. **Keep Stripe package updated** to support newer API versions
5. **Check Stripe changelog** when upgrading API versions

## Related Files

- `src/config/index.ts` - Stripe configuration
- `src/services/PaymentService.ts` - Payment service implementation
- `env.example` - Environment variable template
- `package.json` - Stripe package version

## References

- [Stripe API Versioning](https://stripe.com/docs/api/versioning)
- [Stripe Node.js Library](https://github.com/stripe/stripe-node)
- [Environment Variables Best Practices](https://12factor.net/config)

---

**Updated**: 2025-12-02
**Status**: Production Ready
**Impact**: Allows different Stripe API versions per environment
