import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY?.slice(0, 6) + '...',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '[hidden]' : undefined,
    ABLY_API_KEY: process.env.ABLY_API_KEY?.slice(0, 6) + '...',
    DATABASE_URL: process.env.DATABASE_URL ? '[set]' : '[not set]',
    OTHER_EXPECTED_VAR: process.env.OTHER_EXPECTED_VAR || '[not set]',
  });
}