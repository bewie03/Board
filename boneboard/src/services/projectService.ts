export interface Project {
  id: string;
  title: string; // Changed from name to match API
  name?: string; // Keep for backward compatibility
  description: string;
  website?: string;
  category: string;
  logo?: string | null;
  twitter?: string | {
    username: string;
    verified: boolean;
    id: string;
  };
  discord?: string | {
    serverName: string;
    verified: boolean;
    inviteUrl: string;
  };
  twitterLink?: string; // API field
  discordLink?: string; // API field
  paymentAmount: number;
  paymentCurrency: 'BONE' | 'ADA';
  walletAddress: string;
  timestamp?: number;
  txHash?: string;
  status: 'pending' | 'confirmed' | 'failed' | 'active' | 'verified' | 'completed' | 'paused' | 'cancelled';
  createdAt: string;
  fundingGoal?: number;
  currentFunding?: number;
  backers?: number;
  upvotes?: number;
  downvotes?: number;
  userVote?: string | null;
  fundingAddress?: string;
  expiresAt?: string;
  isVerified?: boolean; // Computed field based on status
  verifiedAt?: string;
  verifiedBy?: string;
}

import { ApiService } from './apiService';

export class ProjectService {
  static async getAllProjects(): Promise<Project[]> {
    try {
      return await ApiService.getProjects();
    } catch (error) {
      console.error('Error getting projects:', error);
      return [];
    }
  }

  // Get active projects (excluding paused ones)
  static async getActiveProjects(): Promise<Project[]> {
    try {
      const projects = await ApiService.getProjects();
      // Filter out paused projects on the client side for now
      return projects.filter(project => project.status !== 'paused');
    } catch (error) {
      console.error('Error getting active projects:', error);
      return [];
    }
  }

  static async addProject(project: Omit<Project, 'id' | 'timestamp' | 'createdAt'>): Promise<Project> {
    const newProject: Project = {
      ...project,
      id: Date.now().toString(),
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    try {
      return await ApiService.createProject(newProject);
    } catch (error) {
      console.error('Error adding project:', error);
      throw error;
    }
  }

  static async getProjectById(id: string): Promise<Project | undefined> {
    try {
      const projects = await this.getAllProjects();
      return projects.find(project => project.id === id);
    } catch (error) {
      console.error('Error getting project by ID:', error);
      return undefined;
    }
  }

  static async updateProject(id: string, updates: Partial<Project>): Promise<boolean> {
    try {
      await ApiService.updateProject(id, updates);
      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      return false;
    }
  }

  static async deleteProject(id: string): Promise<boolean> {
    try {
      await ApiService.deleteProject(id);
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  static async getProjectsByWallet(walletAddress: string): Promise<Project[]> {
    try {
      const projects = await this.getAllProjects();
      return projects.filter(project => project.walletAddress === walletAddress);
    } catch (error) {
      console.error('Error getting projects by wallet:', error);
      return [];
    }
  }
}
