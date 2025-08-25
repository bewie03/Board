// Project service with PostgreSQL backend
import { db } from './database';
import { userService } from './userService';

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  website?: string;
  logoUrl?: string;
  twitterUsername?: string;
  discordInvite?: string;
  githubRepo?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export class ProjectDatabaseService {
  // Create project
  async createProject(walletAddress: string, projectData: Partial<Project>): Promise<Project> {
    try {
      // Ensure user exists
      const user = await userService.createOrGetUser(walletAddress);
      
      const query = `
        INSERT INTO projects (
          user_id, name, description, category, status, website, logo_url,
          twitter_username, discord_invite, github_repo, is_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        user.id,
        projectData.name,
        projectData.description,
        projectData.category,
        projectData.status || 'active',
        projectData.website,
        projectData.logoUrl,
        projectData.twitterUsername,
        projectData.discordInvite,
        projectData.githubRepo,
        projectData.isVerified || false
      ];

      const result = await db.query(query, values);
      return this.mapProjectFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  // Get all projects - Use backend API instead of direct DB
  async getAllProjects(filters?: { category?: string; status?: string }): Promise<Project[]> {
    try {
      // Use backend API instead of direct database connection
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.status) params.append('status', filters.status);
      
      const response = await fetch(`/api/projects?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const projects = await response.json();
      return projects.map((project: any) => this.mapApiProjectToFrontend(project));
    } catch (error) {
      console.error('Error getting projects:', error);
      return [];
    }
  }

  // Get project by ID
  async getProjectById(projectId: string): Promise<Project | null> {
    try {
      const query = `
        SELECT p.*, u.wallet_address 
        FROM projects p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = $1
      `;
      const result = await db.query(query, [projectId]);
      return result.rows.length > 0 ? this.mapProjectFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting project by ID:', error);
      return null;
    }
  }

  // Get projects by user wallet
  async getProjectsByWallet(walletAddress: string): Promise<Project[]> {
    try {
      const query = `
        SELECT p.*, u.wallet_address 
        FROM projects p
        JOIN users u ON p.user_id = u.id
        WHERE u.wallet_address = $1
        ORDER BY p.created_at DESC
      `;
      const result = await db.query(query, [walletAddress]);
      return result.rows.map((row: Record<string, any>) => this.mapProjectFromDb(row));
    } catch (error) {
      console.error('Error getting projects by wallet:', error);
      return [];
    }
  }

  // Update project
  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'userId')
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const values = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'userId')
        .map(key => (updates as any)[key]);

      const query = `
        UPDATE projects 
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await db.query(query, [projectId, ...values]);
      return this.mapProjectFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // Migration method to move data from localStorage
  async migrateFromLocalStorage(): Promise<void> {
    try {
      console.log('Starting projects migration from localStorage...');
      
      // Get data from localStorage
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      
      for (const project of projects) {
        try {
          // Check if already migrated
          const existing = await this.getProjectById(project.id);
          if (existing) {
            console.log(`Project ${project.name} already migrated, skipping...`);
            continue;
          }

          // Create project
          await this.createProject(project.walletAddress || project.owner, {
            name: project.name,
            description: project.description,
            category: project.category,
            status: project.status || 'active',
            website: project.website,
            logoUrl: project.logo,
            twitterUsername: project.twitter?.username,
            discordInvite: project.discord?.inviteUrl,
            githubRepo: project.github,
            isVerified: project.verified || false
          });

          console.log(`Successfully migrated project: ${project.name}`);
        } catch (error) {
          console.error(`Error migrating project ${project.name}:`, error);
        }
      }

      console.log('Projects migration completed');
    } catch (error) {
      console.error('Error during projects migration:', error);
    }
  }

  private mapApiProjectToFrontend(apiProject: any): Project {
    return {
      id: apiProject.id,
      userId: apiProject.walletAddress,
      name: apiProject.title, // API uses 'title', frontend uses 'name'
      description: apiProject.description,
      category: apiProject.category,
      status: apiProject.status,
      website: apiProject.website,
      logoUrl: apiProject.logo,
      twitterUsername: apiProject.twitterLink,
      discordInvite: apiProject.discordLink,
      githubRepo: apiProject.githubRepo,
      isVerified: apiProject.isVerified || false,
      createdAt: apiProject.createdAt,
      updatedAt: apiProject.updatedAt || apiProject.createdAt
    };
  }

  private mapProjectFromDb(row: Record<string, any>): Project {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      category: row.category,
      status: row.status,
      website: row.website,
      logoUrl: row.logo_url,
      twitterUsername: row.twitter_username,
      discordInvite: row.discord_invite,
      githubRepo: row.github_repo,
      isVerified: row.is_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export const projectDatabaseService = new ProjectDatabaseService();
