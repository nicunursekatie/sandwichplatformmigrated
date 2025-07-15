#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mifquzfaqtcyboqntfyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZnF1emZhcXRjeWJvcW50ZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNjg5MDYsImV4cCI6MjA2NzY0NDkwNn0.-XI67cD19CP2KJ0FOGPLBpv2oXcC0iuY1wefJNb2CuA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getCurrentUsers() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .order('first_name');
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    
    console.log('Current users in database:');
    users.forEach(user => {
      console.log(`${user.first_name} ${user.last_name} (${user.email}) - ID: ${user.id}`);
    });
    
    return users;
  } catch (error) {
    console.error('Error:', error);
  }
}

getCurrentUsers(); 