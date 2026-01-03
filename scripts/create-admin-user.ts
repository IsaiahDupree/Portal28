/**
 * Script to create admin user with email/password authentication
 * Run with: npx ts-node scripts/create-admin-user.ts
 * 
 * This creates a user with admin privileges in Supabase
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function createAdminUser() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const email = "isaiahdupree@portal28.io";
  const password = "Frogger12";

  console.log(`Creating admin user: ${email}`);

  // Create user with password
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Skip email confirmation
  });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      console.log("User already exists. Updating password...");
      
      // Get user by email
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error("Error listing users:", listError);
        process.exit(1);
      }

      const existingUser = users?.find(u => u.email === email);
      
      if (existingUser) {
        // Update user password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { password }
        );
        
        if (updateError) {
          console.error("Error updating user:", updateError);
          process.exit(1);
        }
        
        console.log("Password updated successfully!");
        
        // Ensure admin role
        await ensureAdminRole(supabase, existingUser.id, email);
      }
    } else {
      console.error("Error creating user:", authError);
      process.exit(1);
    }
  } else if (authData.user) {
    console.log("User created successfully!");
    await ensureAdminRole(supabase, authData.user.id, email);
  }

  console.log("\n✅ Admin user setup complete!");
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
}

async function ensureAdminRole(supabase: any, userId: string, email: string) {
  // Check if user exists in users table
  const { data: existingUser, error: checkError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    console.error("Error checking user:", checkError);
  }

  if (!existingUser) {
    // Create user in public.users table with admin role
    const { error: insertError } = await supabase
      .from("users")
      .insert({
        id: userId,
        email,
        role: "admin",
      });

    if (insertError) {
      console.error("Error inserting user:", insertError);
    } else {
      console.log("User added to users table with admin role");
    }
  } else {
    // Update role to admin
    const { error: updateError } = await supabase
      .from("users")
      .update({ role: "admin" })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating role:", updateError);
    } else {
      console.log("User role updated to admin");
    }
  }
}

createAdminUser();
