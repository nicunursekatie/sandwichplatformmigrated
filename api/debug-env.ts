import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '❌ undefined',
    SUPABASE_URL: process.env.SUPABASE_URL || '❌ undefined',
    ABLY_API_KEY: process.env.ABLY_API_KEY || '❌ undefined',
  });
}