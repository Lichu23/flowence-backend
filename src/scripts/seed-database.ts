/**
 * Database Seeding via Supabase Client
 * Creates initial test data for development
 */

import { supabaseService } from '../services/SupabaseService';
import bcrypt from 'bcryptjs';

const supabase = supabaseService.getAdminClient();

async function seedDatabase(): Promise<void> {
  console.log('🌱 Starting database seeding...\n');

  try {
    // 1. Create test owner
    console.log('👤 Creating test owner...');
    const ownerPassword = await bcrypt.hash('Password123!', 12);
    
    const { data: owner, error: ownerError } = await supabase
      .from('users')
      .insert({
        email: 'owner@flowence.com',
        password_hash: ownerPassword,
        name: 'Test Owner',
        role: 'owner'
      })
      .select()
      .single();

    if (ownerError) {
      console.error('❌ Error creating owner:', ownerError);
      throw ownerError;
    }
    console.log(`✅ Created owner: ${owner.email}\n`);

    // 2. Create test stores
    console.log('🏪 Creating test stores...');
    const stores = [
      {
        owner_id: owner.id,
        name: 'Flowence Downtown',
        address: '123 Main St, City Center',
        phone: '+1-555-0101',
        currency: 'USD',
        tax_rate: 16.00
      },
      {
        owner_id: owner.id,
        name: 'Flowence Uptown',
        address: '456 North Ave, Uptown',
        phone: '+1-555-0102',
        currency: 'USD',
        tax_rate: 16.00
      }
    ];

    const createdStores = [];
    for (const store of stores) {
      const { data: newStore, error: storeError } = await supabase
        .from('stores')
        .insert(store)
        .select()
        .single();

      if (storeError) {
        console.error('❌ Error creating store:', storeError);
        throw storeError;
      }
      createdStores.push(newStore);
      console.log(`✅ Created store: ${newStore.name}`);
    }
    console.log('');

    // 3. Create user_stores relationships
    console.log('🔗 Creating user-store relationships...');
    for (const store of createdStores) {
      const { error: relationError } = await supabase
        .from('user_stores')
        .insert({
          user_id: owner.id,
          store_id: store.id,
          role: 'owner'
        });

      if (relationError) {
        console.error('❌ Error creating relationship:', relationError);
        throw relationError;
      }
      console.log(`✅ Linked owner to ${store.name}`);
    }
    console.log('');

    // 4. Create sample products for first store
    console.log('📦 Creating sample products for Downtown store...');
    const products = [
      {
        store_id: createdStores[0].id,
        name: 'Coca Cola 2L',
        barcode: '7501234567890',
        price: 2.50,
        cost: 1.50,
        stock: 50,
        category: 'Beverages'
      },
      {
        store_id: createdStores[0].id,
        name: 'Bread Loaf',
        barcode: '7501234567891',
        price: 1.99,
        cost: 0.99,
        stock: 30,
        category: 'Bakery'
      },
      {
        store_id: createdStores[0].id,
        name: 'Milk 1L',
        barcode: '7501234567892',
        price: 1.75,
        cost: 1.00,
        stock: 40,
        category: 'Dairy'
      },
      {
        store_id: createdStores[0].id,
        name: 'Eggs (12 units)',
        barcode: '7501234567893',
        price: 3.50,
        cost: 2.00,
        stock: 25,
        category: 'Dairy'
      },
      {
        store_id: createdStores[0].id,
        name: 'Potato Chips',
        barcode: '7501234567894',
        price: 2.25,
        cost: 1.25,
        stock: 60,
        category: 'Snacks'
      }
    ];

    const { error: productsError } = await supabase
      .from('products')
      .insert(products);

    if (productsError) {
      console.error('❌ Error creating products:', productsError);
      throw productsError;
    }
    console.log(`✅ Created ${products.length} products\n`);

    // 5. Create sample products for second store
    console.log('📦 Creating sample products for Uptown store...');
    const productsUptown = [
      {
        store_id: createdStores[1].id,
        name: 'Coca Cola 2L',
        barcode: '7501234567890', // Same barcode, different store
        price: 2.75,
        cost: 1.60,
        stock: 45,
        category: 'Beverages'
      },
      {
        store_id: createdStores[1].id,
        name: 'Bread Loaf',
        barcode: '7501234567891',
        price: 2.25,
        cost: 1.10,
        stock: 35,
        category: 'Bakery'
      }
    ];

    const { error: productsUptownError } = await supabase
      .from('products')
      .insert(productsUptown);

    if (productsUptownError) {
      console.error('❌ Error creating products for Uptown:', productsUptownError);
      throw productsUptownError;
    }
    console.log(`✅ Created ${productsUptown.length} products\n`);

    // 6. Create test employee
    console.log('👥 Creating test employee...');
    const employeePassword = await bcrypt.hash('Employee123!', 12);
    
    const { data: employee, error: employeeError } = await supabase
      .from('users')
      .insert({
        email: 'employee@flowence.com',
        password_hash: employeePassword,
        name: 'Test Employee',
        role: 'employee'
      })
      .select()
      .single();

    if (employeeError) {
      console.error('❌ Error creating employee:', employeeError);
      throw employeeError;
    }
    console.log(`✅ Created employee: ${employee.email}`);

    // 7. Assign employee to first store
    const { error: employeeRelationError } = await supabase
      .from('user_stores')
      .insert({
        user_id: employee.id,
        store_id: createdStores[0].id,
        role: 'employee'
      });

    if (employeeRelationError) {
      console.error('❌ Error assigning employee:', employeeRelationError);
      throw employeeRelationError;
    }
    console.log(`✅ Assigned employee to ${createdStores[0].name}\n`);

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📝 Test Accounts:');
    console.log('   Owner: owner@flowence.com / Password123!');
    console.log('   Employee: employee@flowence.com / Employee123!');
    console.log('\n🏪 Created Stores:');
    console.log(`   1. ${createdStores[0].name} (${products.length} products)`);
    console.log(`   2. ${createdStores[1].name} (${productsUptown.length} products)\n`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run seeding
seedDatabase()
  .then(() => {
    console.log('✅ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
