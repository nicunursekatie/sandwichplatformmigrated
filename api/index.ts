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

// Initialize routes in a way that works with serverless
let routesInitialized = false;

app.use(async (req, res, next) => {
  if (!routesInitialized && req.path.startsWith('/api/') && req.path !== '/api/test') {
    try {
      const { registerRoutes } = await import('../server/routes');
      await registerRoutes(app);
      routesInitialized = true;
      console.log('Routes initialized successfully');
    } catch (error) {
      console.error('Failed to initialize routes:', error);
      return res.status(500).json({ error: 'Failed to initialize application' });
    }
  }
  next();
});

export default app; 