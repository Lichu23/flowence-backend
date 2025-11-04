-- =============================================
-- FLOWENCE DATABASE SCHEMA FOR SUPABASE
-- =============================================
-- Execute this SQL in your Supabase SQL Editor
-- This creates all necessary tables for the Flowence application

-- =============================================
-- 1. CREATE STORES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'USD',
    tax_rate DECIMAL(5,4) DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    owner_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. CREATE USERS TABLE (without password_hash - Supabase Auth handles this)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'employee')),
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. CREATE PRODUCTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    barcode VARCHAR(255),
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    cost DECIMAL(10,2) NOT NULL CHECK (cost > 0),
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    category VARCHAR(100),
    description TEXT,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure price > cost
    CONSTRAINT check_price_greater_than_cost CHECK (price > cost),
    
    -- Ensure barcode is unique within store
    CONSTRAINT unique_barcode_per_store UNIQUE (barcode, store_id)
);

-- =============================================
-- 4. CREATE SALES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card')),
    amount_received DECIMAL(10,2) NOT NULL CHECK (amount_received >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. CREATE SALE_ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 6. CREATE INVITATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('employee')),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Stores indexes
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_stores_name ON stores(name);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(store_id, stock) WHERE is_active = true;

-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);

-- Sale items indexes
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- Invitations indexes
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_store_id ON invitations(store_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_is_active ON invitations(is_active);

-- =============================================
-- 8. CREATE UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- 9. CREATE TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE TRIGGER update_stores_updated_at 
    BEFORE UPDATE ON stores 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at 
    BEFORE UPDATE ON sales 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invitations_updated_at 
    BEFORE UPDATE ON invitations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 11. STORES POLICIES
-- =============================================

-- Store owners can view and manage their own stores
CREATE POLICY "Store owners can manage their stores" ON stores
    FOR ALL USING (auth.uid() = owner_id);

-- Store employees can view their store
CREATE POLICY "Store employees can view their store" ON stores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.store_id = stores.id 
            AND users.is_active = true
        )
    );

-- =============================================
-- 12. USERS POLICIES
-- =============================================

-- Users can view and update their own profile
CREATE POLICY "Users can manage their own profile" ON users
    FOR ALL USING (auth.uid() = id);

-- Store owners can view all users in their store
CREATE POLICY "Store owners can view store users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = users.store_id 
            AND stores.owner_id = auth.uid()
        )
    );

-- Store employees can view other users in their store
CREATE POLICY "Store employees can view store users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users as u
            WHERE u.id = auth.uid() 
            AND u.store_id = users.store_id 
            AND u.is_active = true
        )
    );

-- =============================================
-- 13. PRODUCTS POLICIES
-- =============================================

-- Store owners can manage all products in their store
CREATE POLICY "Store owners can manage store products" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = products.store_id 
            AND stores.owner_id = auth.uid()
        )
    );

-- Store employees can view and update products in their store
CREATE POLICY "Store employees can manage store products" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.store_id = products.store_id 
            AND users.is_active = true
        )
    );

-- =============================================
-- 14. SALES POLICIES
-- =============================================

-- Store owners can manage all sales in their store
CREATE POLICY "Store owners can manage store sales" ON sales
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = sales.store_id 
            AND stores.owner_id = auth.uid()
        )
    );

-- Store employees can manage sales in their store
CREATE POLICY "Store employees can manage store sales" ON sales
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.store_id = sales.store_id 
            AND users.is_active = true
        )
    );

-- =============================================
-- 15. SALE_ITEMS POLICIES
-- =============================================

-- Sale items inherit permissions from their parent sale
CREATE POLICY "Sale items inherit sale permissions" ON sale_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = sale_items.sale_id 
            AND (
                EXISTS (
                    SELECT 1 FROM stores 
                    WHERE stores.id = sales.store_id 
                    AND stores.owner_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.store_id = sales.store_id 
                    AND users.is_active = true
                )
            )
        )
    );

-- =============================================
-- 16. INVITATIONS POLICIES
-- =============================================

-- Store owners can manage invitations for their store
CREATE POLICY "Store owners can manage store invitations" ON invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = invitations.store_id 
            AND stores.owner_id = auth.uid()
        )
    );

-- =============================================
-- 17. SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =============================================

-- Uncomment the following lines to insert sample data for testing

/*
-- Insert a sample store (you'll need to replace the owner_id with a real UUID from auth.users)
INSERT INTO stores (id, name, address, phone, currency, tax_rate, low_stock_threshold, owner_id) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Mi Tienda de Prueba',
    '123 Calle Principal, Ciudad de Prueba',
    '+1-555-0123',
    'USD',
    0.08,
    5,
    'YOUR_OWNER_USER_ID_HERE' -- Replace with actual user ID from auth.users
);

-- Insert sample products
INSERT INTO products (name, barcode, price, cost, stock, category, description, store_id) VALUES
('Producto de Prueba 1', '1234567890123', 10.99, 7.50, 100, 'Electrónicos', 'Un producto de prueba para desarrollo', '550e8400-e29b-41d4-a716-446655440000'),
('Producto de Prueba 2', '1234567890124', 5.99, 3.50, 50, 'Libros', 'Otro producto de prueba', '550e8400-e29b-41d4-a716-446655440000');
*/

-- =============================================
-- COMPLETION MESSAGE
-- =============================================
-- Schema creation completed successfully!
-- You can now use the Flowence application with Supabase.
