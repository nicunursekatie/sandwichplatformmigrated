import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;

  // 🔒 Replace with your actual secret key used in the Ably webhook header
  const expectedSecret = 'Bearer sandwich_secret_948fhf2m3';

  if (authHeader !== expectedSecret) {
    console.warn('Unauthorized webhook request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('✅ Received Ably webhook event:', req.body);

  // TODO: Add handling logic here if needed

  return res.status(200).json({ received: true });
} 