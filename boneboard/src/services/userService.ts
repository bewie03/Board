// User management service with PostgreSQL backend
import { db } from './database';

export interface User {
  id: string;
  walletAddress: string;
  username?: string;
  email?: string;
  profileType: 'user' | 'freelancer' | 'client' | 'both';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class UserService {
  // Create or get user by wallet address
  async createOrGetUser(walletAddress: string): Promise<User> {
    try {
      // First try to get existing user
      const existingUser = await this.getUserByWallet(walletAddress);
      if (existingUser) {
        return existingUser;
      }

      // Create new user
      const query = `
        INSERT INTO users (wallet_address, profile_type)
        VALUES ($1, $2)
        RETURNING *
      `;
      const result = await db.query(query, [walletAddress, 'user']);
      return this.mapUserFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error creating/getting user:', error);
      throw error;
    }
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE wallet_address = $1';
      const result = await db.query(query, [walletAddress]);
      return result.rows.length > 0 ? this.mapUserFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting user by wallet:', error);
      return null;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id')
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const values = Object.keys(updates)
        .filter(key => key !== 'id')
        .map(key => (updates as any)[key]);

      const query = `
        UPDATE users 
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await db.query(query, [id, ...values]);
      return this.mapUserFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  private mapUserFromDb(row: any): User {
    return {
      id: row.id,
      walletAddress: row.wallet_address,
      username: row.username,
      email: row.email,
      profileType: row.profile_type,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export const userService = new UserService();
