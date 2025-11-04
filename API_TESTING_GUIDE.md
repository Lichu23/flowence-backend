# 🧪 API Testing Guide - Sprint 1.2

## Flowence Multi-Store API Testing

Este documento contiene ejemplos de requests para probar la API multi-tienda.

---

## 🚀 Setup

1. Asegúrate de que el servidor esté corriendo:
```bash
cd server
npm run dev
```

2. El servidor debería estar en: `http://localhost:3001`

---

## 📝 Endpoints Disponibles

### Authentication Endpoints
- `POST /api/auth/register` - Register owner with first store
- `POST /api/auth/login` - Login and get stores
- `GET /api/auth/me` - Get current user with stores
- `POST /api/auth/logout` - Logout

### Store Endpoints
- `GET /api/stores` - Get all user's stores
- `POST /api/stores` - Create new store (owners only)
- `GET /api/stores/:id` - Get store details
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store

---

## 🧪 Test Scenarios

### 1️⃣ Register New Owner (Creates First Store)

**Request:**
```http
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "email": "newowner@flowence.com",
  "password": "Password123!",
  "name": "New Owner",
  "store_name": "My First Store"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "newowner@flowence.com",
      "name": "New Owner",
      "role": "owner",
      "stores": [
        {
          "id": "store-uuid",
          "name": "My First Store",
          "role": "owner"
        }
      ]
    },
    "token": "jwt-token-here"
  },
  "message": "User registered successfully"
}
```

---

### 2️⃣ Login (Returns User with Stores)

**Request:**
```http
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "owner@flowence.com",
  "password": "Password123!"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "owner@flowence.com",
      "name": "Test Owner",
      "role": "owner",
      "stores": [
        {
          "id": "store-1-uuid",
          "name": "Flowence Downtown",
          "role": "owner"
        },
        {
          "id": "store-2-uuid",
          "name": "Flowence Uptown",
          "role": "owner"
        }
      ]
    },
    "token": "jwt-token"
  },
  "message": "Login successful"
}
```

---

### 3️⃣ Get Current User Profile (with Stores)

**Request:**
```http
GET http://localhost:3001/api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "owner@flowence.com",
      "name": "Test Owner",
      "role": "owner",
      "stores": [...]
    }
  }
}
```

---

### 4️⃣ Get All User's Stores

**Request:**
```http
GET http://localhost:3001/api/stores
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "store-1-uuid",
      "name": "Flowence Downtown",
      "address": "123 Main St",
      "role": "owner"
    },
    {
      "id": "store-2-uuid",
      "name": "Flowence Uptown",
      "address": "456 North Ave",
      "role": "owner"
    }
  ]
}
```

---

### 5️⃣ Create New Store (Owners Only)

**Request:**
```http
POST http://localhost:3001/api/stores
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Flowence Airport",
  "address": "789 Airport Rd",
  "phone": "+1-555-0103",
  "currency": "USD",
  "tax_rate": 16.00,
  "low_stock_threshold": 5
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "new-store-uuid",
    "owner_id": "user-uuid",
    "name": "Flowence Airport",
    "address": "789 Airport Rd",
    "phone": "+1-555-0103",
    "currency": "USD",
    "tax_rate": 16.00,
    "low_stock_threshold": 5,
    "created_at": "2025-10-09T...",
    "updated_at": "2025-10-09T..."
  },
  "message": "Store created successfully"
}
```

---

### 6️⃣ Get Store Details

**Request:**
```http
GET http://localhost:3001/api/stores/STORE_UUID
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "store": {
      "id": "store-uuid",
      "owner_id": "user-uuid",
      "name": "Flowence Downtown",
      "address": "123 Main St",
      ...
    },
    "stats": {
      "total_products": 5,
      "total_sales": 0,
      "total_revenue": 0,
      "total_employees": 1
    }
  }
}
```

---

### 7️⃣ Update Store (Owners Only)

**Request:**
```http
PUT http://localhost:3001/api/stores/STORE_UUID
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Flowence Downtown (Updated)",
  "phone": "+1-555-9999",
  "tax_rate": 18.00
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "store-uuid",
    "name": "Flowence Downtown (Updated)",
    "phone": "+1-555-9999",
    "tax_rate": 18.00,
    ...
  },
  "message": "Store updated successfully"
}
```

---

### 8️⃣ Delete Store (Owners Only)

**Request:**
```http
DELETE http://localhost:3001/api/stores/STORE_UUID
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Store deleted successfully"
}
```

**Note:** Cannot delete if it's your only store!

---

### 9️⃣ Get Store Users

**Request:**
```http
GET http://localhost:3001/api/stores/STORE_UUID/users
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "relation-uuid",
      "user_id": "owner-uuid",
      "store_id": "store-uuid",
      "role": "owner",
      "user": {
        "id": "owner-uuid",
        "name": "Test Owner",
        "email": "owner@flowence.com"
      }
    }
  ]
}
```

---

### 🔟 Get Store Statistics

**Request:**
```http
GET http://localhost:3001/api/stores/STORE_UUID/stats
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "total_products": 5,
    "total_sales": 10,
    "total_revenue": 250.50,
    "total_employees": 2,
    "average_sale_amount": 25.05
  }
}
```

---

## 🧪 Testing con cURL

### Register:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@flowence.com",
    "password": "Password123!",
    "name": "Test User",
    "store_name": "Test Store"
  }'
```

### Login:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@flowence.com",
    "password": "Password123!"
  }'
```

### Get Stores:
```bash
curl -X GET http://localhost:3001/api/stores \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## ✅ Verification Checklist

### Authentication
- [ ] Register creates user + first store
- [ ] Login returns user with stores array
- [ ] GET /me returns user with stores
- [ ] Token works for authenticated endpoints

### Stores
- [ ] GET /stores returns all user's stores
- [ ] POST /stores creates new store (owner only)
- [ ] GET /stores/:id returns store details
- [ ] PUT /stores/:id updates store (owner only)
- [ ] DELETE /stores/:id deletes store (owner only)
- [ ] Cannot delete if it's the only store

### Multi-Store Isolation
- [ ] Owner sees all their stores
- [ ] Employee sees only assigned stores
- [ ] Cannot access stores they don't belong to (403)

---

## 🐛 Common Errors

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```
**Fix:** Include `Authorization: Bearer TOKEN` header

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have access to this store"
  }
}
```
**Fix:** User doesn't have access to this store

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data"
  }
}
```
**Fix:** Check request body format

---

## 📊 Testing Flow

1. **Register** a new owner → Get token
2. **Login** with existing user → Get token + stores
3. **Get stores** → Verify multi-store list
4. **Create store** → Add second store
5. **Update store** → Modify store data
6. **Get store details** → Verify data + stats
7. **Delete store** → Remove store (if not last one)

---

**Ready to test!** 🚀

Use Postman, Thunder Client, Insomnia, or cURL to test these endpoints.

