import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ENV: {
      ABLY_API_KEY: process.env.ABLY_API_KEY ? '✅ set' : '❌ missing',
      SUPABASE_URL: process.env.SUPABASE_URL ? '✅ set' : '❌ missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ set' : '❌ missing',
      SESSION_SECRET: process.env.SESSION_SECRET ? '✅ set' : '❌ missing',
      NODE_ENV: process.env.NODE_ENV || 'unknown',
    },
  });
}