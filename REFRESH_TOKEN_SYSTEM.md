# Sistema de Refresh Tokens Persistentes

## 🎯 Objetivo

Solucionar el problema de expiración de tokens durante operaciones críticas (como cobrar a un cliente), implementando un sistema de refresh tokens que solo expiren cuando el usuario haga logout.

## 🔄 Cómo Funciona

### 1. **Login/Registro**
- Se generan dos tokens:
  - **Access Token**: Expira en 30 minutos (para operaciones normales)
  - **Refresh Token**: Expira en 90 días (solo se revoca en logout)
- El refresh token se guarda en la tabla `refresh_tokens` con hash SHA256 para seguridad

### 2. **Operaciones Normales**
- El cliente usa el **Access Token** en cada petición
- El Access Token se renueva automáticamente cada 25 minutos (antes de expirar)

### 3. **Renovación Automática**
- Cuando el Access Token está por expirar:
  - El frontend envía el **Refresh Token** al endpoint `/api/auth/refresh-token`
  - El backend valida que el token existe en la BD y no está revocado
  - Se genera un **nuevo Access Token** (el Refresh Token permanece igual)
  - El usuario continúa trabajando sin interrupciones

### 4. **Logout**
- El refresh token se marca como `is_revoked = true` en la base de datos
- El token queda invalidado permanentemente
- Opcionalmente, se puede cerrar sesión en un solo dispositivo o en todos

## 📊 Tabla `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token_hash VARCHAR(255) UNIQUE,      -- Hash SHA256 del token
  expires_at TIMESTAMP,                 -- Expira en 90 días
  is_revoked BOOLEAN DEFAULT FALSE,     -- Se marca en logout
  revoked_at TIMESTAMP,                 -- Cuándo se revocó
  user_agent TEXT,                      -- Navegador/dispositivo
  ip_address VARCHAR(45),               -- IP de origen
  created_at TIMESTAMP,                 -- Cuándo se creó
  last_used_at TIMESTAMP                -- Última vez usado
);
```

## 🔐 Seguridad

1. **Tokens Hasheados**: Los refresh tokens se guardan hasheados (SHA256), no en texto plano
2. **Validación Doble**: Se valida tanto en la BD como la firma JWT
3. **Revocación**: Los tokens revocados no se pueden usar nunca más
4. **Expiración**: Aunque duren 90 días, se invalidan en logout
5. **Tracking**: Se registra IP y User-Agent para auditoría

## 📝 Flujo Completo

```
┌─────────────┐
│   LOGIN     │
└──────┬──────┘
       │
       ├─► Genera Access Token (30min)
       ├─► Genera Refresh Token (90 días)
       └─► Guarda Refresh Token en BD
              │
              ▼
       ┌──────────────┐
       │  TRABAJANDO  │ ◄──┐
       └──────┬───────┘    │
              │            │
    ¿Access Token      │
     expirando?        │
         SÍ │          │
            ▼          │
     ┌──────────────┐  │
     │   REFRESH    │  │
     └──────┬───────┘  │
            │          │
  ┌─────────┴─────────┐
  │ 1. Valida en BD   │
  │ 2. Verifica JWT   │
  │ 3. Nuevo Access   │
  └─────────┬─────────┘
            │
            └──────────────┘
              
       ┌──────────────┐
       │   LOGOUT     │
       └──────┬───────┘
              │
              └─► Revoca Refresh Token en BD
                  (is_revoked = TRUE)
```

## 🚀 Cómo Aplicar

### 1. Ejecutar Migración SQL
```bash
cd server
psql -h localhost -U postgres -d flowence_db -f src/database/migrations/013_create_refresh_tokens.sql
```

### 2. Reiniciar Servidor
```bash
npm run dev
```

### 3. Frontend (ya implementado)
El frontend ya tiene el auto-refresh implementado en `AuthContext.tsx`:
- Renueva el token cada 25 minutos automáticamente
- Maneja errores y redirige a login si falla

## 🎨 Beneficios

### ✅ Para Empleados
- **Sin interrupciones**: Pueden cobrar a un cliente sin que expire el token a mitad del proceso
- **Sesión persistente**: No necesitan volver a loguearse cada 30 minutos
- **Experiencia fluida**: El refresh es automático e invisible

### ✅ Para Seguridad
- **Control total**: Los tokens se pueden revocar en cualquier momento
- **Auditoría**: Se registra cuándo y desde dónde se usó cada token
- **Multidispositivo**: Se puede cerrar sesión en un dispositivo específico

### ✅ Para el Sistema
- **Escalable**: Los tokens expirados se limpian automáticamente
- **Flexible**: Se puede ajustar el tiempo de expiración según necesidad
- **Robusto**: Doble validación (BD + JWT)

## 📊 Gestión de Sesiones

### Ver sesiones activas de un usuario
```typescript
const sessions = await refreshTokenModel.getActiveSessionsForUser(userId);
console.log(`Usuario tiene ${sessions.length} sesiones activas`);
```

### Cerrar sesión en todos los dispositivos
```typescript
await refreshTokenModel.revokeAllForUser(userId);
```

### Cerrar sesión solo en el dispositivo actual
```typescript
await refreshTokenModel.revoke(refreshToken);
```

### Limpiar tokens expirados (mantenimiento)
```typescript
const cleaned = await refreshTokenModel.cleanupExpired();
console.log(`Eliminados ${cleaned} tokens expirados`);
```

## ⚙️ Configuración

### Tiempos de Expiración
```typescript
// AuthService.ts

// Access Token: 30 minutos (renovable)
expiresIn: '30m'

// Refresh Token: 90 días (solo revocable en logout)
expiresIn: '90d'
```

### Frontend: Auto-refresh
```typescript
// AuthContext.tsx
// Renueva cada 25 minutos (5 min antes de expirar)
const refreshInterval = 25 * 60 * 1000;
```

## 🔧 Troubleshooting

### "Refresh token expired"
- El token tiene más de 90 días
- Solución: El usuario debe volver a loguearse

### "Invalid or revoked refresh token"
- El token fue revocado en logout
- O el token no existe en la BD
- Solución: El usuario debe volver a loguearse

### Token no se renueva automáticamente
- Verificar que `AuthContext` tiene el useEffect configurado
- Verificar que `localStorage` tiene el refreshToken guardado
- Revisar logs del navegador para errores

## 📚 Archivos Modificados

1. **Backend**:
   - `server/src/models/RefreshTokenModel.ts` (nuevo)
   - `server/src/services/AuthService.ts` (actualizado)
   - `server/src/controllers/AuthController.ts` (actualizado)
   - `server/src/database/migrations/013_create_refresh_tokens.sql` (nuevo)

2. **Frontend** (ya existía):
   - `flowence-client/src/contexts/AuthContext.tsx` (auto-refresh implementado)
   - `flowence-client/src/lib/api.ts` (interceptor 401)

## 🎉 Resultado Final

Con este sistema:
- ✅ Los empleados pueden trabajar sin interrupciones
- ✅ Las ventas no se interrumpen por tokens expirados
- ✅ Hay control total sobre las sesiones activas
- ✅ Mayor seguridad con tokens revocables
- ✅ Mejor experiencia de usuario

---

**Fecha de Implementación**: 15 de Octubre, 2025
**Versión**: 1.0

