import { supabaseService } from '../services/SupabaseService';

async function cleanupSupabaseAuth() {
  try {
    console.log('🧹 Starting Supabase Auth cleanup...');
    
    // Get all users from Supabase Auth
    const { data: users, error: listError } = await supabaseService.getAdminClient().auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }
    
    if (!users || users.users.length === 0) {
      console.log('✅ No users found in Supabase Auth');
      return;
    }
    
    console.log(`📊 Found ${users.users.length} users in Supabase Auth`);
    
    // Delete each user
    for (const user of users.users) {
      console.log(`🗑️ Deleting user: ${user.email} (${user.id})`);
      
      const { error: deleteError } = await supabaseService.getAdminClient().auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error(`❌ Error deleting user ${user.email}:`, deleteError);
      } else {
        console.log(`✅ Successfully deleted user: ${user.email}`);
      }
    }
    
    console.log('🎉 Supabase Auth cleanup completed!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
cleanupSupabaseAuth();
