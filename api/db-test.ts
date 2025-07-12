import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "DATABASE_URL not configured" });
    }
    
    const { db } = await import('../server/db');
    const { hosts } = await import('../shared/schema');
    const { count } = await import('drizzle-orm');
    
    const result = await db.select({ count: count() }).from(hosts);
    res.json({ 
      message: "Database connected successfully", 
      hostCount: result[0]?.count || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ 
      error: "Database connection failed", 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 