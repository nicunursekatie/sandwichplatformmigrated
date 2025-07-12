import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hostsApi } from './lib/hosts';
import { collectionsApi } from './lib/collections';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Test hosts API
    const hosts = await hostsApi.getAllHosts();
    
    // Test collections API
    const collections = await collectionsApi.getAllCollections();
    const stats = await collectionsApi.getCollectionStats();
    
    res.json({ 
      message: "Database connected successfully", 
      hosts: {
        count: hosts.length,
        sample: hosts.slice(0, 3) // First 3 hosts
      },
      collections: {
        count: collections.length,
        stats: stats,
        sample: collections.slice(0, 3) // First 3 collections
      },
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