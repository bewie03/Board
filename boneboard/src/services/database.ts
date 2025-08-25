// Database connection and query service for PostgreSQL
import { Pool, PoolClient } from 'pg';

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL || process.env.REACT_APP_DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('DATABASE_URL not found. Database operations will be disabled.');
}

class DatabaseService {
  private pool: Pool | null = null;
  private isConnected = false;

  constructor() {
    this.initializePool();
  }

  private initializePool() {
    if (!DATABASE_URL) return;

    try {
      this.pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      this.pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
        this.isConnected = false;
      });

      this.testConnection();
    } catch (error) {
      console.error('Failed to initialize database pool:', error);
    }
  }

  private async testConnection() {
    if (!this.pool) return;

    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection test failed:', error);
      this.isConnected = false;
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool || !this.isConnected) {
      throw new Error('Database not connected');
    }

    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool || !this.isConnected) {
      throw new Error('Database not connected');
    }
    return await this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  isReady(): boolean {
    return this.isConnected && this.pool !== null;
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
    }
  }
}

// Export singleton instance
export const db = new DatabaseService();
export default DatabaseService;
