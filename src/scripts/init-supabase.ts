#!/usr/bin/env ts-node

import { supabaseService } from '../services/SupabaseService';
import { config } from '../config';

async function initializeSupabase() {
  console.log('🚀 Initializing Flowence with Supabase...');
  console.log(`📊 Environment: ${config.server.nodeEnv}`);
  console.log(`🔗 Supabase URL: ${config.supabase.url}`);
  
  try {
    // Test Supabase connection
    console.log('🔌 Testing Supabase connection...');
    const { error } = await supabaseService.getAdminClient()
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      throw error;
    }

    console.log('✅ Supabase connection successful!');

    // Check if tables exist
    console.log('📋 Checking database schema...');
    
    const tables = ['users', 'stores', 'products', 'sales', 'sale_items', 'invitations'];
    
    for (const table of tables) {
      try {
        const { error } = await supabaseService.getAdminClient()
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`⚠️  Table ${table} not found or not accessible`);
        } else {
          console.log(`✅ Table ${table} is accessible`);
        }
      } catch (err) {
        console.log(`❌ Error checking table ${table}:`, err);
      }
    }

    // Seed database if in development
    if (config.server.nodeEnv === 'development') {
      console.log('🌱 Seeding Supabase database...');
      await seedSupabaseDatabase();
    }

    console.log('✅ Supabase initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Supabase initialization failed:', error);
    process.exit(1);
  } finally {
    await supabaseService.close();
  }
}

async function seedSupabaseDatabase() {
  try {
    // Check if database is already seeded
    const { data: existingUsers } = await supabaseService.getAdminClient()
      .from('users')
      .select('id')
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      console.log('📋 Database already seeded, skipping...');
      return;
    }

    console.log('🌱 Seeding database with test data...');

    // Create a test store
    const { data: store, error: storeError } = await supabaseService.getAdminClient()
      .from('stores')
      .insert({
        name: 'Test Store',
        address: '123 Main Street, Test City',
        phone: '+1-555-0123',
        currency: 'USD',
        tax_rate: 0.08,
        low_stock_threshold: 5,
        owner_id: '00000000-0000-0000-0000-000000000000' // Placeholder
      })
      .select()
      .single();

    if (storeError) {
      console.error('Error creating store:', storeError);
      return;
    }

    console.log('✅ Test store created');

    // Create test products
    const products = [
      {
        name: 'Test Product 1',
        barcode: '1234567890123',
        price: 10.99,
        cost: 7.50,
        stock: 100,
        category: 'Electronics',
        description: 'A test product for development',
        store_id: store.id
      },
      {
        name: 'Test Product 2',
        barcode: '1234567890124',
        price: 5.99,
        cost: 3.50,
        stock: 50,
        category: 'Books',
        description: 'Another test product',
        store_id: store.id
      }
    ];

    const { error: productsError } = await supabaseService.getAdminClient()
      .from('products')
      .insert(products)
      .select();

    if (productsError) {
      console.error('Error creating products:', productsError);
      return;
    }

    console.log('✅ Test products created');

    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  initializeSupabase();
}

export { initializeSupabase };
