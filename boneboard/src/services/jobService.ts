export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  salary: string;
  salaryType: string;
  customSalaryType?: string;
  category: string;
  type: string;
  contactEmail: string;
  howToApply: string;
  duration: number;
  paymentAmount: number;
  paymentCurrency: 'BONE' | 'ADA';
  walletAddress: string;
  timestamp: number;
  txHash?: string;
  status: 'pending' | 'confirmed' | 'failed' | 'paused';
  createdAt: string;
  expiresAt: string;
  workArrangement?: 'remote' | 'hybrid' | 'onsite';
  requiredSkills?: string[];
  additionalInfo?: string[];
  companyWebsite?: string;
  companyLogo?: string | null;
  website?: string;
  twitter?: string;
  discord?: string;
  featured?: boolean;
}

import { ApiService } from './apiService';

export class JobService {
  // Get all jobs from database
  static async getAllJobs(): Promise<Job[]> {
    try {
      return await ApiService.getJobs();
    } catch (error) {
      console.error('Error getting jobs:', error);
      return [];
    }
  }

  // Get jobs for a specific user
  static async getUserJobs(walletAddress: string): Promise<Job[]> {
    try {
      return await ApiService.getJobs({ wallet: walletAddress });
    } catch (error) {
      console.error('Error getting user jobs:', error);
      return [];
    }
  }

  // Add new job to database
  static async addJob(jobData: Omit<Job, 'id' | 'createdAt' | 'expiresAt'>): Promise<Job> {
    try {
      return await ApiService.createJob(jobData);
    } catch (error) {
      console.error('Error adding job:', error);
      throw error;
    }
  }

  // Update job in database
  static async updateJob(jobId: string, updates: Partial<Job>): Promise<boolean> {
    try {
      await ApiService.updateJob(jobId, updates);
      return true;
    } catch (error) {
      console.error('Error updating job:', error);
      return false;
    }
  }

  // Delete job from database
  static async deleteJob(jobId: string): Promise<boolean> {
    try {
      await ApiService.deleteJob(jobId);
      return true;
    } catch (error) {
      console.error('Error deleting job:', error);
      return false;
    }
  }

  // Get job by ID
  static async getJobById(jobId: string): Promise<Job | null> {
    try {
      return await ApiService.getJobById(jobId);
    } catch (error) {
      console.error('Error getting job by ID:', error);
      return null;
    }
  }

  // Get jobs by category
  static async getJobsByCategory(category: string): Promise<Job[]> {
    try {
      return await ApiService.getJobs({ category });
    } catch (error) {
      console.error('Error getting jobs by category:', error);
      return [];
    }
  }

  // Search jobs (client-side filtering for now)
  static async searchJobs(query: string): Promise<Job[]> {
    try {
      const jobs = await this.getAllJobs();
      const searchTerm = query.toLowerCase();
      
      return jobs.map(job => ({ ...job, logo: job.companyLogo || null })).filter(job => 
        (job.title && job.title.toLowerCase().includes(searchTerm)) ||
        (job.company && job.company.toLowerCase().includes(searchTerm)) ||
        (job.description && job.description.toLowerCase().includes(searchTerm)) ||
        (job.category && job.category.toLowerCase().includes(searchTerm)) ||
        (job.type && job.type.toLowerCase().includes(searchTerm)) ||
        (job.requiredSkills && job.requiredSkills.some(skill => 
          skill && skill.toLowerCase().includes(searchTerm)
        ))
      );
    } catch (error) {
      console.error('Error searching jobs:', error);
      return [];
    }
  }

  // Get active jobs from database
  static async getActiveJobs(): Promise<Job[]> {
    try {
      return await ApiService.getJobs({ active: true });
    } catch (error) {
      console.error('Error getting active jobs:', error);
      return [];
    }
  }

  static async initializeSampleJobs(): Promise<void> {
    // Sample jobs initialization removed - no longer needed
    return;
  }

  static async forceReinitializeSampleJobs(): Promise<void> {
    // Sample jobs initialization removed - no longer needed
    return;
  }

  // Sample jobs creation removed - no longer needed
}

// Initialize sample jobs when the module loads (async version)
if (typeof window !== 'undefined') {
  JobService.initializeSampleJobs().catch(console.error);
}
