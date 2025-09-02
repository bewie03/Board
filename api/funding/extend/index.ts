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
    const { projectId, newExpiryDate, walletAddress } = req.body;

    if (!projectId || !newExpiryDate || !walletAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectId, newExpiryDate, walletAddress' 
      });
    }

    // Verify the project belongs to the wallet
    const projectCheck = await pool.query(
      'SELECT id, expires_at FROM projects WHERE id = $1 AND wallet_address = $2',
      [projectId, walletAddress]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    // Update the project's expiry date
    const updateResult = await pool.query(
      `UPDATE projects 
       SET expires_at = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND wallet_address = $3 
       RETURNING id, expires_at`,
      [newExpiryDate, projectId, walletAddress]
    );

    if (updateResult.rows.length === 0) {
      return res.status(500).json({ error: 'Failed to update project expiry date' });
    }

    console.log(`Project ${projectId} expiry updated to: ${newExpiryDate}`);

    res.status(200).json({
      success: true,
      message: 'Project expiry date updated successfully',
      newExpiryDate,
      projectId
    });

  } catch (error) {
    console.error('Error updating project expiry:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
