import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check route
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
    databaseUrl: process.env.DATABASE_URL ? "configured" : "missing",
  });
});

// Simple test route to check if API is working
app.get("/api/test", (_req, res) => {
  res.json({ message: "API is working!", timestamp: new Date().toISOString() });
});

// Test database connection
app.get("/api/db-test", async (_req, res) => {
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
});

export default app; 