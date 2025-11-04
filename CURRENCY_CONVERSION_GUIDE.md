# Multi-Currency Conversion System

## Overview

The Flowence multi-currency conversion system allows stores to operate with multiple currencies and automatically convert product prices when changing the store's primary currency. This ensures that product values remain consistent across different currencies.

## Features

### 1. Automatic Price Conversion
- When a store changes its currency, all product prices are automatically converted
- Both `price` (selling price) and `cost` (purchase cost) are updated
- Conversion uses real-time exchange rates with 1-hour caching

### 2. Supported Currencies
- USD (US Dollar)
- EUR (Euro) 
- GBP (British Pound)
- JPY (Japanese Yen)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)
- MXN (Mexican Peso)
- ARS (Argentine Peso)

### 3. Exchange Rate Management
- Mock exchange rates for development (replace with real API in production)
- 1-hour cache to improve performance
- Automatic rate refresh when cache expires

### 4. Conversion Validation
- Validates currency codes before conversion
- Prevents conversion to the same currency
- Provides detailed error reporting

## API Endpoints

### 1. Get Exchange Rate
```http
GET /api/stores/exchange-rate/:from/:to
```

**Example:**
```http
GET /api/stores/exchange-rate/ARS/EUR
```

**Response:**
```json
{
  "success": true,
  "data": {
    "from": "ARS",
    "to": "EUR",
    "rate": 0.0011,
    "updated_at": "2025-01-15T10:30:00.000Z"
  },
  "message": "Exchange rate retrieved successfully",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 2. Convert Amount
```http
POST /api/stores/convert-amount
```

**Body:**
```json
{
  "amount": 1000,
  "from": "ARS",
  "to": "EUR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original_amount": 1000,
    "from": "ARS",
    "converted_amount": 1.10,
    "to": "EUR",
    "rate": 0.0011,
    "updated_at": "2025-01-15T10:30:00.000Z"
  },
  "message": "Amount converted successfully",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 3. Get Supported Currencies
```http
GET /api/stores/supported-currencies
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currencies": ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "MXN", "ARS"]
  },
  "message": "Supported currencies retrieved successfully",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 4. Preview Currency Conversion
```http
POST /api/stores/:id/preview-conversion
```

**Body:**
```json
{
  "toCurrency": "EUR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "store_id": "store-123",
    "from_currency": "ARS",
    "to_currency": "EUR",
    "exchange_rate": 0.0011,
    "preview_products": [
      {
        "id": "product-1",
        "name": "Product A",
        "barcode": "123456789",
        "current_price": 1000,
        "current_cost": 600,
        "current_currency": "ARS",
        "converted_price": 1.10,
        "converted_cost": 0.66,
        "target_currency": "EUR"
      }
    ],
    "total_products": 150,
    "message": "Preview of currency conversion from ARS to EUR"
  },
  "message": "Currency conversion preview generated successfully",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 5. Convert Specific Products
```http
POST /api/stores/:id/convert-products
```

**Body:**
```json
{
  "productIds": ["product-1", "product-2", "product-3"],
  "toCurrency": "EUR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "store_id": "store-123",
    "from_currency": "ARS",
    "to_currency": "EUR",
    "exchange_rate": 0.0011,
    "results": {
      "successful": [
        {
          "product_id": "product-1",
          "name": "Product A",
          "original_price": 1000,
          "converted_price": 1.10,
          "original_cost": 600,
          "converted_cost": 0.66
        }
      ],
      "failed": [
        {
          "product_id": "product-2",
          "error": "Product not found"
        }
      ]
    },
    "summary": {
      "total_requested": 3,
      "successful": 2,
      "failed": 1
    }
  },
  "message": "Converted 2 of 3 products to EUR",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 6. Update Store Currency (Automatic Conversion)
```http
PUT /api/stores/:id
```

**Body:**
```json
{
  "currency": "EUR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "store-123",
    "name": "My Store",
    "currency": "EUR",
    "currency_conversion": {
      "from": "ARS",
      "to": "EUR",
      "products": {
        "converted": 148,
        "failed": 2,
        "errors": ["Failed to convert product-456: Database error"]
      },
      "sales": {
        "converted": 1250,
        "failed": 5,
        "errors": ["Failed to convert sale-789: Database error"]
      },
      "total_converted": 1398
    }
  },
  "message": "Store updated successfully",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 7. Convert Specific Sales
```http
POST /api/stores/:id/convert-sales
```

**Body:**
```json
{
  "saleIds": ["sale-1", "sale-2", "sale-3"],
  "toCurrency": "EUR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "store_id": "store-123",
    "from_currency": "ARS",
    "to_currency": "EUR",
    "exchange_rate": 0.0011,
    "results": {
      "successful": [
        {
          "sale_id": "sale-1",
          "receipt_number": "REC-2025-001",
          "original_total": 1000,
          "converted_total": 1.10
        }
      ],
      "failed": [
        {
          "sale_id": "sale-2",
          "error": "Sale not found"
        }
      ]
    },
    "summary": {
      "total_requested": 3,
      "successful": 2,
      "failed": 1
    }
  },
  "message": "Converted 2 of 3 sales to EUR",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Usage Examples

### Example 1: Converting from ARS to EUR

1. **Check exchange rate:**
```bash
GET /api/stores/exchange-rate/ARS/EUR
# Returns: 0.0011 (1 ARS = 0.0011 EUR)
```

2. **Preview conversion:**
```bash
POST /api/stores/store-123/preview-conversion
{
  "toCurrency": "EUR"
}
```

3. **Execute conversion:**
```bash
PUT /api/stores/store-123
{
  "currency": "EUR"
}
```

### Example 3: Converting Specific Sales

```bash
POST /api/stores/store-123/convert-sales
{
  "saleIds": ["sale-1", "sale-2"],
  "toCurrency": "USD"
}
```

## Sales Data Conversion

### What Gets Converted
When sales are converted to a new currency, the following fields are updated:

**Sales Table:**
- `subtotal` - Total before tax and discount
- `tax` - Tax amount
- `discount` - Discount amount  
- `total` - Final sale amount

**Sale Items Table:**
- `unit_price` - Price per unit
- `subtotal` - Item subtotal (quantity × unit_price)
- `discount` - Item discount
- `total` - Item total after discount

### Conversion Process
1. **Batch Processing**: Sales are processed in batches of 100 to handle large datasets
2. **Exchange Rate**: Uses the same rate as product conversion
3. **Precision**: All amounts are rounded to 2 decimal places
4. **Error Handling**: Failed conversions are logged but don't stop the process
5. **Audit Trail**: Each conversion is logged with receipt numbers

### Dashboard Impact
After currency conversion:
- **Monthly Revenue**: All historical monthly revenue figures are automatically displayed in the new currency
- **Overall Revenue**: Total revenue across all time reflects the new currency
- **Sales Analytics**: All sales reports and analytics use the converted values

## Exchange Rate Logic

### Current Mock Rates
```javascript
const mockRates = {
  'ARS': { 'USD': 0.0011, 'EUR': 0.0010, 'GBP': 0.0009, 'MXN': 0.059 },
  'USD': { 'ARS': 909.09, 'EUR': 0.92, 'GBP': 0.79, 'MXN': 53.57 },
  'EUR': { 'ARS': 1000.00, 'USD': 1.09, 'GBP': 0.86, 'MXN': 58.24 },
  'GBP': { 'ARS': 1111.11, 'USD': 1.27, 'EUR': 1.16, 'MXN': 67.73 },
  'MXN': { 'ARS': 16.90, 'USD': 0.019, 'EUR': 0.017, 'GBP': 0.015 },
  'CAD': { 'ARS': 666.67, 'USD': 0.73, 'EUR': 0.67, 'GBP': 0.58, 'MXN': 40.00 },
  'AUD': { 'ARS': 588.24, 'USD': 0.65, 'EUR': 0.59, 'GBP': 0.51, 'MXN': 35.29 },
  'JPY': { 'ARS': 6.06, 'USD': 0.0067, 'EUR': 0.0061, 'GBP': 0.0053, 'MXN': 0.36 }
};
```

### Price Calculation
```javascript
// Convert price with proper rounding
const convertedPrice = Math.round(originalPrice * exchangeRate * 100) / 100;
const convertedCost = Math.round(originalCost * exchangeRate * 100) / 100;
```

## Error Handling

### Common Error Codes

- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Only store owners can perform currency operations
- `BAD_REQUEST`: Missing required parameters
- `NOT_FOUND`: Store not found
- `INVALID_CURRENCY`: Currency code not supported
- `SAME_CURRENCY`: Target currency is the same as current

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CURRENCY",
    "message": "Invalid currency code. Supported currencies: USD, EUR, GBP, JPY, CAD, AUD, MXN, ARS"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Production Considerations

### 1. Real Exchange Rate API
Replace mock rates with a real API service:
- ExchangeRate-API
- Open Exchange Rates
- Central Bank APIs
- Fixer.io

### 2. Rate Limiting
Implement rate limiting for exchange rate requests to avoid API limits.

### 3. Backup Strategy
- Create database backup before bulk currency conversion
- Implement rollback functionality for failed conversions

### 4. Performance Optimization
- Batch process large product catalogs
- Use database transactions for consistency
- Implement background jobs for large conversions

### 5. Audit Trail
- Log all currency conversions
- Track conversion rates used
- Monitor conversion success/failure rates

## Testing

### Test Scenarios
1. **Basic Conversion**: Convert single amount between currencies
2. **Store Currency Change**: Update store currency and convert all products
3. **Preview Conversion**: Preview conversion without executing
4. **Specific Products**: Convert only selected products
5. **Error Handling**: Test invalid currencies, permissions, etc.
6. **Edge Cases**: Same currency conversion, zero amounts, etc.

### Example Test Cases
```javascript
// Test basic conversion
POST /api/stores/convert-amount
{
  "amount": 1000,
  "from": "ARS", 
  "to": "EUR"
}
// Expected: converted_amount ≈ 1.10

// Test same currency error
POST /api/stores/store-123/preview-conversion
{
  "toCurrency": "ARS"  // Same as current
}
// Expected: 400 error with SAME_CURRENCY code
```

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Only store owners can perform currency operations
3. **Input Validation**: All inputs are validated and sanitized
4. **Rate Limiting**: Prevent abuse of exchange rate endpoints
5. **Audit Logging**: All currency operations are logged

## Future Enhancements

1. **Historical Rates**: Support for historical exchange rates
2. **Multiple Rate Providers**: Fallback to alternative rate providers
3. **Scheduled Conversions**: Automatic currency conversion at scheduled times
4. **Currency Analytics**: Reports on currency conversion impact
5. **Multi-Currency Pricing**: Support products with prices in multiple currencies
