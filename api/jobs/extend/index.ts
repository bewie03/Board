// @ts-ignore
import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobId, months, walletAddress, txHash } = req.body;

    if (!jobId || !months || !walletAddress || !txHash) {
      return res.status(400).json({ 
        error: 'Missing required fields: jobId, months, walletAddress, txHash' 
      });
    }

    // Verify the job belongs to the wallet
    const jobCheck = await pool.query(
      'SELECT id, expires_at FROM job_listings WHERE id = $1 AND wallet_address = $2',
      [jobId, walletAddress]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found or unauthorized' });
    }

    // Calculate new expiry date by adding months to current expiry
    const currentExpiry = new Date(jobCheck.rows[0].expires_at);
    const newExpiryDate = new Date(currentExpiry);
    newExpiryDate.setMonth(newExpiryDate.getMonth() + months);

    // Update the job's expiry date
    const updateResult = await pool.query(
      `UPDATE job_listings 
       SET expires_at = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND wallet_address = $3 
       RETURNING id, expires_at`,
      [newExpiryDate.toISOString(), jobId, walletAddress]
    );

    if (updateResult.rows.length === 0) {
      return res.status(500).json({ error: 'Failed to update job expiry date' });
    }

    console.log(`Job ${jobId} expiry extended by ${months} months to: ${newExpiryDate.toISOString()}`);

    res.status(200).json({
      success: true,
      message: 'Job expiry date extended successfully',
      newExpiryDate: newExpiryDate.toISOString(),
      jobId,
      txHash
    });

  } catch (error) {
    console.error('Error updating job expiry:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
