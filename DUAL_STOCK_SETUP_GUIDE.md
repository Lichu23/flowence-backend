# Guía de Configuración: Sistema de Doble Stock

## ⚠️ Problema Actual

Si estás viendo este error:
```
Could not find the 'min_stock_deposito' column of 'products' in the schema cache
```

Significa que necesitas ejecutar la migración SQL para agregar las columnas de doble stock.

---

## 🔧 Solución: Ejecutar Migración SQL

### Paso 1: Abrir Supabase Dashboard

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto de Flowence
3. En el menú lateral, click en **SQL Editor**

### Paso 2: Ejecutar Migración

1. Click en **"New Query"**
2. Copia **TODO** el contenido del archivo `DUAL_STOCK_MIGRATION.sql`
3. Pega en el editor SQL
4. Click en **"Run"** o presiona `Ctrl + Enter`

### Paso 3: Verificar Ejecución

Ejecuta esta query para verificar que las columnas fueron creadas:

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('stock_deposito', 'stock_venta', 'min_stock_deposito', 'min_stock_venta')
ORDER BY column_name;
```

**Resultado esperado:** Deberías ver 4 filas con las nuevas columnas.

### Paso 4: Reiniciar Servidor

Después de ejecutar la migración:

```bash
cd server
npm run dev
```

---

## 📊 Qué Hace la Migración

### 1. Crea Tabla `stock_movements`
- Registra todos los movimientos de stock
- Auditoría completa (quién, cuándo, por qué)
- Políticas de seguridad (RLS)

### 2. Agrega Columnas a `products`
- `stock_deposito`: Stock de almacén/bodega
- `stock_venta`: Stock de piso de ventas  
- `min_stock_deposito`: Mínimo de depósito (default: 10)
- `min_stock_venta`: Mínimo de venta (default: 5)

### 3. Migra Datos Existentes
- Distribuye stock actual: 70% depósito, 30% venta
- Mantiene compatibilidad con campo legacy `stock`

### 4. Crea Trigger Automático
- Mantiene campo `stock` sincronizado
- `stock = stock_deposito + stock_venta` (automático)

---

## ✅ Verificación Post-Migración

### Verifica que productos tengan stock dual:

```sql
SELECT 
  id,
  name,
  stock,
  stock_deposito,
  stock_venta,
  min_stock_deposito,
  min_stock_venta
FROM products
LIMIT 5;
```

Deberías ver valores en las columnas nuevas.

### Verifica que la tabla stock_movements existe:

```sql
SELECT COUNT(*) as movement_count FROM stock_movements;
```

Debería retornar 0 (tabla vacía pero existente).

---

## 🎯 Nueva Lógica de Stock para Empleados

Después de la migración, cuando un empleado edita el stock de venta:

### Escenario 1: Aumentar Stock de Venta
```
Stock actual:
- Depósito: 50
- Venta: 20

Empleado cambia venta a: 30 (aumenta 10)

Resultado:
- Depósito: 40 (automáticamente descontado)
- Venta: 30
```

### Escenario 2: Disminuir Stock de Venta  
```
Stock actual:
- Depósito: 40
- Venta: 30

Empleado cambia venta a: 25 (disminuye 5)

Resultado:
- Depósito: 45 (automáticamente devuelto)
- Venta: 25
```

### Escenario 3: Stock Insuficiente (ERROR)
```
Stock actual:
- Depósito: 5
- Venta: 20

Empleado intenta cambiar venta a: 30 (aumentar 10)

Resultado:
❌ ERROR: "Stock insuficiente en depósito. Disponible: 5, Necesario: 10"
```

---

## 🚀 Después de la Migración

Tu sistema tendrá:

✅ **Doble stock completamente funcional**
✅ **Validaciones robustas** (nunca stocks negativos)
✅ **Auto-descuento** del depósito al aumentar venta
✅ **Auto-devolución** al depósito al disminuir venta
✅ **Auditoría completa** en `stock_movements`
✅ **Mensajes en español** para usuarios

---

## 📝 Notas Importantes

- La migración es **segura** (usa `IF NOT EXISTS`)
- **No perderás datos** existentes
- Productos existentes se distribuyen **70% depósito / 30% venta**
- Puedes ejecutar la migración **múltiples veces** sin problemas
- El trigger mantiene el campo `stock` legacy **automáticamente**

---

## ❓ Problemas Comunes

### Error: "relation already exists"
**Solución:** Ignóralo, significa que ya tienes la tabla creada.

### Error: "column already exists"
**Solución:** Ignóralo, las columnas ya fueron agregadas.

### Error: "constraint already exists"
**Solución:** Ignóralo, los constraints ya existen.

### Cache de Schema en Supabase
**Solución:** Espera 1-2 minutos para que Supabase actualice su caché, luego reinicia el servidor.

---

## 🆘 Ayuda Adicional

Si tienes problemas:
1. Verifica que estás ejecutando en el proyecto correcto de Supabase
2. Verifica que tienes permisos de admin
3. Revisa los logs del SQL Editor para errores específicos
4. Reinicia el servidor después de ejecutar la migración

---

**¡Listo! Después de ejecutar esta migración, tu sistema de doble stock estará completamente funcional!** ✅

