import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hostsApi } from './lib/hosts';

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
          // Get specific host
          const host = await hostsApi.getHost(Number(req.query.id));
          if (!host) {
            return res.status(404).json({ error: 'Host not found' });
          }
          return res.json(host);
        } else if (req.query.active === 'true') {
          // Get active hosts only
          const hosts = await hostsApi.getActiveHosts();
          return res.json(hosts);
        } else {
          // Get all hosts
          const hosts = await hostsApi.getAllHosts();
          return res.json(hosts);
        }

      case 'POST':
        // Create new host
        const newHost = await hostsApi.createHost(req.body);
        return res.status(201).json(newHost);

      case 'PUT':
        if (!req.query.id) {
          return res.status(400).json({ error: 'Host ID is required' });
        }
        // Update host
        const updatedHost = await hostsApi.updateHost(Number(req.query.id), req.body);
        if (!updatedHost) {
          return res.status(404).json({ error: 'Host not found' });
        }
        return res.json(updatedHost);

      case 'DELETE':
        if (!req.query.id) {
          return res.status(400).json({ error: 'Host ID is required' });
        }
        // Delete host
        const success = await hostsApi.deleteHost(Number(req.query.id));
        if (!success) {
          return res.status(404).json({ error: 'Host not found' });
        }
        return res.status(204).end();

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Hosts API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
} 