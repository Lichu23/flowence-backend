-- Sales and Sale Items tables
create table if not exists sales (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  user_id uuid not null references users(id),
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method text not null check (payment_method in ('cash','card','mixed')),
  payment_status text not null default 'completed' check (payment_status in ('completed','refunded','cancelled','pending')),
  receipt_number text not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists sales_receipt_unique on sales(store_id, receipt_number);
create index if not exists sales_store_idx on sales(store_id);
create index if not exists sales_created_idx on sales(created_at desc);

create table if not exists sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name text not null,
  product_sku text,
  product_barcode text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  subtotal numeric(12,2) not null,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  stock_type text not null default 'venta' check (stock_type in ('venta','deposito')),
  created_at timestamptz default now()
);

create index if not exists sale_items_sale_idx on sale_items(sale_id);
create index if not exists sale_items_product_idx on sale_items(product_id);

comment on table sales is 'Sales per store';
comment on table sale_items is 'Items per sale';

