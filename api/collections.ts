import type { VercelRequest, VercelResponse } from '@vercel/node';
import { collectionsApi } from './lib/collections';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        if (req.query.id) {
          // Get specific collection
          const collection = await collectionsApi.getCollection(Number(req.query.id));
          if (!collection) {
            return res.status(404).json({ error: 'Collection not found' });
          }
          return res.json(collection);
        } else if (req.query.host) {
          // Get collections by host
          const collections = await collectionsApi.getCollectionsByHost(req.query.host as string);
          return res.json(collections);
        } else if (req.query.stats === 'true') {
          // Get collection statistics
          const stats = await collectionsApi.getCollectionStats();
          return res.json(stats);
        } else if (req.query.count === 'true') {
          // Get collections count
          const count = await collectionsApi.getCollectionsCount();
          return res.json({ count });
        } else {
          // Get collections with pagination
          const limit = req.query.limit ? Number(req.query.limit) : 50;
          const offset = req.query.offset ? Number(req.query.offset) : 0;
          const collections = await collectionsApi.getCollections(limit, offset);
          return res.json(collections);
        }

      case 'POST':
        // Create new collection
        const newCollection = await collectionsApi.createCollection(req.body);
        return res.status(201).json(newCollection);

      case 'PUT':
        if (!req.query.id) {
          return res.status(400).json({ error: 'Collection ID is required' });
        }
        // Update collection
        const updatedCollection = await collectionsApi.updateCollection(Number(req.query.id), req.body);
        if (!updatedCollection) {
          return res.status(404).json({ error: 'Collection not found' });
        }
        return res.json(updatedCollection);

      case 'DELETE':
        if (!req.query.id) {
          return res.status(400).json({ error: 'Collection ID is required' });
        }
        // Delete collection
        const success = await collectionsApi.deleteCollection(Number(req.query.id));
        if (!success) {
          return res.status(404).json({ error: 'Collection not found' });
        }
        return res.status(204).end();

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Collections API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
} 