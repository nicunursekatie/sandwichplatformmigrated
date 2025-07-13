import { VercelRequest, VercelResponse } from '@vercel/node';
import Ably from 'ably';
import { createClient } from '@supabase/supabase-js';

// Check required environment variables
if (!process.env.ABLY_API_KEY) {
  throw new Error('ABLY_API_KEY environment variable is required');
}
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}
if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY environment variable is required');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

// Initialize Ably with your PRIVATE API key (never expose this in frontend)
const ably = new Ably.Rest(process.env.ABLY_API_KEY);

// Initialize Supabase client with anon key (public key)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// For admin operations, we'll use the service role key directly in queries
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, type, title, body, source_id, related_type, related_id, celebration_data } = req.body;
  if (!user_id || !type || !title || !body) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Insert notification into Supabase using admin client to bypass RLS
  const { data, error } = await supabaseAdmin.from('notifications').insert([
    {
      user_id,
      type,
      title,
      body,
      source_id,
      related_type,
      related_id,
      celebration_data,
      read: false,
      created_at: new Date().toISOString()
    }
  ]).select().single();

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: 'Failed to insert notification' });
  }

  // Publish to Ably for real-time delivery
  try {
    await ably.channels.get(`notifications:${user_id}`).publish('new-notification', data);
  } catch (err) {
    console.error('Ably publish error:', err);
    // Still return success, since notification is stored
  }

  return res.status(200).json({ success: true, notification: data });
} 