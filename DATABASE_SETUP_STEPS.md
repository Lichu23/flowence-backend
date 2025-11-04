# 🚀 Pasos para Configurar la Base de Datos

## Estado Actual
✅ Migraciones generadas correctamente  
📄 Archivo creado: `server/combined-migrations.sql`

---

## 📝 PASOS A SEGUIR:

### 1. Limpiar Base de Datos Antigua (Manual)
**Opción A: Desde Supabase Dashboard**
1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a: `Table Editor`
4. Elimina manualmente estas tablas (en orden):
   - `sale_items`
   - `sales`
   - `invitations`
   - `products`
   - `users`
   - `stores`

**Opción B: Via SQL Editor**
1. Ve a: `SQL Editor`
2. Copia y pega:
```sql
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS user_stores CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
```
3. Click "Run"

---

### 2. Ejecutar Nuevas Migraciones
1. Abre el archivo: `server/combined-migrations.sql`
2. **Copia TODO el contenido**
3. Ve a Supabase Dashboard → `SQL Editor`
4. Pega el SQL completo
5. Click "Run" ▶️

**⏱️ Tiempo estimado:** 10-15 segundos

---

### 3. Poblar con Datos de Prueba
Desde tu terminal (en la carpeta server):

```bash
npm run db:seed
```

Esto creará:
- **Owner**: `owner@flowence.com` / `Password123!`
  - Acceso a 2 tiendas
- **Employee**: `employee@flowence.com` / `Employee123!`
  - Acceso a 1 tienda (Downtown)
- **2 Tiendas**: Downtown y Uptown
- **7 Productos** de muestra

---

## ✅ Verificación

Después de ejecutar el seed, verifica en Supabase:

**Table Editor → `users`**
- Deberías ver 2 usuarios

**Table Editor → `stores`**
- Deberías ver 2 tiendas

**Table Editor → `user_stores`**
- Deberías ver 3 relaciones (owner con 2 tiendas + employee con 1)

**Table Editor → `products`**
- Deberías ver 7 productos

---

## 🔄 Si algo sale mal

```bash
# Regenerar el SQL de migraciones
npm run db:migrate

# Intentar seed de nuevo
npm run db:seed
```

---

## 📊 Estructura Creada

```
Owner (owner@flowence.com)
  ├── Flowence Downtown ⭐
  │   ├── 5 productos
  │   └── 1 empleado
  └── Flowence Uptown ⭐
      └── 2 productos

Employee (employee@flowence.com)
  └── Flowence Downtown (solo esta tienda)
```

---

**Siguiente paso:** Una vez completados estos pasos, ¡la base de datos estará lista para el Sprint 1.2!

