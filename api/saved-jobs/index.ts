// Saved jobs API endpoint
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method } = req;

    switch (method) {
      case 'GET':
        // Get saved jobs for user
        return res.status(200).json({ savedJobs: [] });

      case 'POST':
        // Save a job
        return res.status(200).json({ success: true });

      case 'DELETE':
        // Remove saved job
        return res.status(200).json({ success: true });

      default:
        res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS');
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error: any) {
    console.error('Saved jobs API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
