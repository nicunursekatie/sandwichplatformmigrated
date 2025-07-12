import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client
// You'll need to use the service role key for admin operations
const supabaseAdmin = createClient(
  'https://mifquzfaqtcyboqntfyn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjA2ODkwNiwiZXhwIjoyMDY3NjQ0OTA2fQ.kVHVOE9KCuRnAA1F2-BEdtdDWCaq3PFCilwEoWkvL-Y',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Your existing users from the database
const existingUsers = [
  {
    id: "user_1751072243271_fc8jaxl6u",
    email: "mdlouza@gmail.com",
    first_name: "Marcy",
    last_name: "Louza",
    display_name: "Marcy",
    role: "admin",
    metadata: { password: "sandwich123" },
    is_active: true
  },
  {
    id: "user_1752042339523_8fhx1grmh",
    email: "vickib@aol.com",
    first_name: "Vicki",
    last_name: "Tropauer",
    display_name: null,
    role: "admin",
    metadata: { password: "TSP@1562" },
    is_active: true
  },
  {
    id: "user_1752051019036_b8olzcgjp",
    email: "ross.kimberly.a@gmail.com",
    first_name: "Kimberly",
    last_name: "Ross",
    display_name: "Kim Ross",
    role: "admin",
    metadata: { password: "Ugga0720" },
    is_active: true
  },
  {
    id: "user_1752077337593_o8ftmxkwq",
    email: "christine@thesandwichproject.org",
    first_name: "Christine",
    last_name: "Cooper Nowicki",
    display_name: null,
    role: "admin",
    metadata: { password: "sandwich123" },
    is_active: true
  },
  {
    id: "user_1752087530619_vup0ql4d8",
    email: "stephanie@thesandwichproject.org",
    first_name: "Stephanie",
    last_name: "Luis",
    display_name: null,
    role: "admin",
    metadata: { password: "ChloeMarie24!" },
    is_active: true
  },
  {
    id: "driver_1752008770863_96q8ulrzl",
    email: "kenig.ka@gmail.com",
    first_name: "Ken",
    last_name: "Ig",
    display_name: "Katie (Alternate)",
    role: "driver",
    metadata: { password: "sandwich123" },
    is_active: true
  },
  {
    id: "committee_1752011648290",
    email: "katielong2316@gmail.com",
    first_name: "Katie",
    last_name: "Long",
    display_name: null,
    role: "admin",
    metadata: { password: "sandwich123" },
    is_active: true
  },
  {
    id: "admin_1752119953506",
    email: "admin@sandwich.project",
    first_name: "Admin",
    last_name: "User",
    display_name: null,
    role: "admin",
    metadata: { password: "sandwich123" },
    is_active: true
  }
];

async function migrateUsersToSupabaseAuth() {
  console.log('🚀 Starting user migration to Supabase Auth...\n');
  
  const results = {
    success: [],
    failed: []
  };

  for (const user of existingUsers) {
    try {
      console.log(`Processing ${user.email}...`);
      
      // Create Supabase Auth user
      const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.metadata.password,
        email_confirm: true, // Skip email verification for migration
        user_metadata: {
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name,
          role: user.role,
          original_user_id: user.id, // Keep reference to old ID
          is_active: user.is_active
        }
      });

      if (error) throw error;

      // Update the users table to link with Supabase Auth
      // This assumes you have an auth_id column in your users table
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
          auth_id: authUser.user.id,
          // Update the ID to use Supabase's UUID
          id: authUser.user.id 
        })
        .eq('email', user.email); // Match by email instead of ID

      if (updateError) {
        console.warn(`⚠️  Warning: Could not update users table for ${user.email}:`, updateError.message);
      }

      (results.success as string[]).push(user.email);
      console.log(`✅ Successfully migrated: ${user.email}`);
      
    } catch (err: any) {
      (results.failed as { email: string; error: any }[]).push({ email: user.email, error: err.message });
      console.error(`❌ Failed to migrate ${user.email}:`, err.message);
    }
  }

  // Summary
  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successful: ${results.success.length} users`);
  console.log(`❌ Failed: ${results.failed.length} users`);
  
  if (results.failed.length > 0) {
    console.log('\nFailed migrations:');
    (results.failed as { email: string; error: any }[]).forEach(f => 
      console.log(`  - ${f.email}: ${f.error}`)
    );
  }

  return results;
}

// Alternative: Send password reset emails instead of using existing passwords
async function migrateUsersWithPasswordReset() {
  console.log('🚀 Starting user migration with password reset...\n');
  
  for (const user of existingUsers) {
    try {
      // Create user with a random temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
      
      const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name,
          role: user.role,
          original_user_id: user.id,
          is_active: user.is_active
        }
      });

      if (error) throw error;

      // Send password reset email
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
        user.email,
        {
          redirectTo: 'https://yourdomain.com/reset-password', // Update this URL
        }
      );

      if (resetError) throw resetError;

      console.log(`✅ Migrated ${user.email} - Password reset email sent`);
      
    } catch (err: any) {
      console.error(`❌ Failed to migrate ${user.email}:`, err.message);
    }
  }
}

// Run the migration
// Option 1: Use existing passwords
migrateUsersToSupabaseAuth();

// Option 2: Send password reset emails (more secure)
// migrateUsersWithPasswordReset();

// Uncomment the option you want to use above