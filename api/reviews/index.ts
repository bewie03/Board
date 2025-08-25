// Vercel API route for review operations
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createReview, getReviewsByFreelancer } from '../../boneboard/src/lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get reviews for a freelancer
        if (!req.query.freelancerId) {
          return res.status(400).json({ error: 'Freelancer ID required' });
        }
        const reviews = await getReviewsByFreelancer(req.query.freelancerId as string);
        return res.status(200).json(reviews);

      case 'POST':
        // Create new review
        const newReview = await createReview(req.body);
        return res.status(201).json(newReview);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Reviews API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
