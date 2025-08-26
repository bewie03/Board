// Admin service for managing platform settings and content moderation
import { requireAdminAuth } from '../utils/adminAuth';

export interface PlatformSettings {
  projectListingFee: number;
  jobListingFee: number;
  projectListingFeeAda?: number;
  jobListingFeeAda?: number;
  projectListingCurrency: 'ADA' | 'BONE';
  jobListingCurrency: 'ADA' | 'BONE';
  lastUpdated: string;
  updatedBy: string;
}

export class AdminService {
  private static instance: AdminService;
  private baseUrl = '/api/admin';

  public static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  // Platform Settings Management
  async getPlatformSettings(): Promise<PlatformSettings> {
    try {
      const response = await fetch(`${this.baseUrl}?type=settings`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting platform settings:', error);
      // Return default settings if API fails
      return {
        projectListingFee: 500,
        jobListingFee: 250,
        projectListingFeeAda: 50,
        jobListingFeeAda: 25,
        projectListingCurrency: 'BONE',
        jobListingCurrency: 'ADA',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      };
    }
  }

  async updatePlatformSettings(
    walletAddress: string,
    settings: Partial<PlatformSettings>
  ): Promise<PlatformSettings> {
    requireAdminAuth(walletAddress);

    try {
      const response = await fetch(`${this.baseUrl}?type=settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress
        },
        body: JSON.stringify({
          ...settings,
          updatedBy: walletAddress,
          lastUpdated: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating platform settings:', error);
      throw error;
    }
  }

  // Project Management
  async deleteProject(walletAddress: string, projectId: string): Promise<void> {
    requireAdminAuth(walletAddress);

    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'X-Wallet-Address': walletAddress
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  async verifyProject(walletAddress: string, projectId: string): Promise<void> {
    requireAdminAuth(walletAddress);

    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress
        },
        body: JSON.stringify({
          status: 'verified',
          verifiedBy: walletAddress,
          verifiedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error verifying project:', error);
      throw error;
    }
  }

  async unverifyProject(walletAddress: string, projectId: string): Promise<void> {
    requireAdminAuth(walletAddress);

    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/unverify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress
        },
        body: JSON.stringify({
          status: 'active',
          verifiedBy: null,
          verifiedAt: null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error unverifying project:', error);
      throw error;
    }
  }

  async updateProject(
    walletAddress: string,
    projectId: string,
    updates: Record<string, any>
  ): Promise<void> {
    requireAdminAuth(walletAddress);

    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress
        },
        body: JSON.stringify({
          ...updates,
          updatedBy: walletAddress,
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // Job Listing Management
  async deleteJobListing(walletAddress: string, jobId: string): Promise<void> {
    requireAdminAuth(walletAddress);

    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'X-Wallet-Address': walletAddress
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting job listing:', error);
      throw error;
    }
  }

  async updateJobListing(
    walletAddress: string,
    jobId: string,
    updates: Record<string, any>
  ): Promise<void> {
    requireAdminAuth(walletAddress);

    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress
        },
        body: JSON.stringify({
          ...updates,
          updatedBy: walletAddress,
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating job listing:', error);
      throw error;
    }
  }

  // Analytics and Monitoring
  async getAdminStats(): Promise<{
    totalProjects: number;
    verifiedProjects: number;
    totalJobs: number;
    activeJobs: number;
    totalUsers: number;
    recentActivity: any[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting admin stats:', error);
      return {
        totalProjects: 0,
        verifiedProjects: 0,
        totalJobs: 0,
        activeJobs: 0,
        totalUsers: 0,
        recentActivity: []
      };
    }
  }
}

export const adminService = AdminService.getInstance();
