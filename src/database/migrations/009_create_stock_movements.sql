-- Create stock_movements table for audit trail
-- This table tracks all stock movements (restock, adjustments, sales, returns)

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  store_id UUID NOT NULL,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('restock', 'adjustment', 'sale', 'return')),
  stock_type VARCHAR(10) NOT NULL CHECK (stock_type IN ('deposito', 'venta')),
  quantity_change INTEGER NOT NULL, -- Positive for increase, negative for decrease
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reason VARCHAR(255) NOT NULL,
  performed_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_movements_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_movements_user FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_store_id ON stock_movements(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_performed_by ON stock_movements(performed_by);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_store ON stock_movements(product_id, store_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_store_created ON stock_movements(store_id, created_at);

-- Add comments for documentation
COMMENT ON TABLE stock_movements IS 'Audit trail for all stock movements (restock, adjustments, sales, returns)';
COMMENT ON COLUMN stock_movements.id IS 'Unique identifier for the stock movement';
COMMENT ON COLUMN stock_movements.product_id IS 'Reference to the product that was moved';
COMMENT ON COLUMN stock_movements.store_id IS 'Reference to the store where the movement occurred';
COMMENT ON COLUMN stock_movements.movement_type IS 'Type of movement: restock, adjustment, sale, return';
COMMENT ON COLUMN stock_movements.stock_type IS 'Which stock was affected: deposito (warehouse) or venta (sales floor)';
COMMENT ON COLUMN stock_movements.quantity_change IS 'Amount changed (positive for increase, negative for decrease)';
COMMENT ON COLUMN stock_movements.quantity_before IS 'Stock quantity before the movement';
COMMENT ON COLUMN stock_movements.quantity_after IS 'Stock quantity after the movement';
COMMENT ON COLUMN stock_movements.reason IS 'Reason for the stock movement';
COMMENT ON COLUMN stock_movements.performed_by IS 'User who performed the movement';
COMMENT ON COLUMN stock_movements.notes IS 'Additional notes about the movement';
COMMENT ON COLUMN stock_movements.created_at IS 'When the movement was recorded';

-- Enable Row Level Security (RLS) if using Supabase
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for stock movements - users can only see movements from their stores
CREATE POLICY "Users can view stock movements from their stores" ON stock_movements
  FOR SELECT USING (
    store_id IN (
      SELECT us.store_id 
      FROM user_stores us 
      WHERE us.user_id = auth.uid()
    )
  );

-- Create RLS policy for inserting stock movements - users can only insert movements for their stores
CREATE POLICY "Users can insert stock movements for their stores" ON stock_movements
  FOR INSERT WITH CHECK (
    store_id IN (
      SELECT us.store_id 
      FROM user_stores us 
      WHERE us.user_id = auth.uid()
    )
  );
