// API integration layer to connect frontend with database services
import { freelancerDatabaseService, type FreelancerProfile, type ServicePackage } from '../services/freelancerDatabaseService';
import { jobDatabaseService, type JobListing, type JobApplication } from '../services/jobDatabaseService';
import { projectDatabaseService, type Project } from '../services/projectDatabaseService';
import { messagingDatabaseService, type Conversation, type Message } from '../services/messagingDatabaseService';
import { migrationService, type MigrationStatus } from '../services/migrationService';
import { userService, type User } from '../services/userService';

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Helper function to wrap API calls
async function apiCall<T>(operation: () => Promise<T>): Promise<ApiResponse<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    console.error('API Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// User API
export const userApi = {
  async createOrGetUser(walletAddress: string): Promise<ApiResponse<User>> {
    return apiCall(() => userService.createOrGetUser(walletAddress));
  },

  async getUserByWallet(walletAddress: string): Promise<ApiResponse<User | null>> {
    return apiCall(() => userService.getUserByWallet(walletAddress));
  },

  async updateUser(walletAddress: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    return apiCall(() => userService.updateUser(walletAddress, updates));
  }
};

// Freelancer API
export const freelancerApi = {
  async createProfile(walletAddress: string, profileData: Partial<FreelancerProfile>): Promise<ApiResponse<FreelancerProfile>> {
    return apiCall(() => freelancerDatabaseService.createFreelancerProfile(walletAddress, profileData));
  },

  async getProfile(walletAddress: string): Promise<ApiResponse<FreelancerProfile | null>> {
    return apiCall(() => freelancerDatabaseService.getFreelancerByWallet(walletAddress));
  },

  async getProfileById(id: string): Promise<ApiResponse<FreelancerProfile | null>> {
    return apiCall(() => freelancerDatabaseService.getFreelancerById(id));
  },

  async getAllProfiles(filters?: { category?: string; skills?: string[] }): Promise<ApiResponse<FreelancerProfile[]>> {
    return apiCall(() => freelancerDatabaseService.getAllFreelancers(filters));
  },

  async updateProfile(walletAddress: string, updates: Partial<FreelancerProfile>): Promise<ApiResponse<FreelancerProfile>> {
    return apiCall(() => freelancerDatabaseService.updateFreelancerProfile(walletAddress, updates));
  },

  async createPackage(freelancerId: string, packageData: Partial<ServicePackage>): Promise<ApiResponse<ServicePackage>> {
    return apiCall(() => freelancerDatabaseService.createServicePackage(freelancerId, packageData));
  },

  async getPackages(freelancerId: string): Promise<ApiResponse<ServicePackage[]>> {
    return apiCall(() => freelancerDatabaseService.getServicePackages(freelancerId));
  },

  async updatePackage(packageId: string, updates: Partial<ServicePackage>): Promise<ApiResponse<ServicePackage>> {
    return apiCall(() => freelancerDatabaseService.updateServicePackage(packageId, updates));
  },

  async migrateFromLocalStorage(): Promise<ApiResponse<void>> {
    return apiCall(() => freelancerDatabaseService.migrateFromLocalStorage());
  }
};

// Job API
export const jobApi = {
  async createJob(walletAddress: string, jobData: Partial<JobListing>): Promise<ApiResponse<JobListing>> {
    return apiCall(() => jobDatabaseService.createJobListing(walletAddress, jobData));
  },

  async getAllJobs(filters?: { category?: string; jobType?: string; workArrangement?: string }): Promise<ApiResponse<JobListing[]>> {
    return apiCall(() => jobDatabaseService.getAllJobListings(filters));
  },

  async getJobById(jobId: string): Promise<ApiResponse<JobListing | null>> {
    return apiCall(() => jobDatabaseService.getJobById(jobId));
  },

  async getJobsByWallet(walletAddress: string): Promise<ApiResponse<JobListing[]>> {
    return apiCall(() => jobDatabaseService.getJobsByWallet(walletAddress));
  },

  async updateJob(jobId: string, updates: Partial<JobListing>): Promise<ApiResponse<JobListing>> {
    return apiCall(() => jobDatabaseService.updateJobListing(jobId, updates));
  },

  async applyToJob(applicationData: Partial<JobApplication>): Promise<ApiResponse<JobApplication>> {
    return apiCall(() => jobDatabaseService.createJobApplication(applicationData));
  },

  async getJobApplications(jobId: string): Promise<ApiResponse<JobApplication[]>> {
    return apiCall(() => jobDatabaseService.getJobApplications(jobId));
  },

  async migrateFromLocalStorage(): Promise<ApiResponse<void>> {
    return apiCall(() => jobDatabaseService.migrateFromLocalStorage());
  }
};

// Project API
export const projectApi = {
  async createProject(walletAddress: string, projectData: Partial<Project>): Promise<ApiResponse<Project>> {
    return apiCall(() => projectDatabaseService.createProject(walletAddress, projectData));
  },

  async getAllProjects(filters?: { category?: string; status?: string }): Promise<ApiResponse<Project[]>> {
    return apiCall(() => projectDatabaseService.getAllProjects(filters));
  },

  async getProjectById(projectId: string): Promise<ApiResponse<Project | null>> {
    return apiCall(() => projectDatabaseService.getProjectById(projectId));
  },

  async getProjectsByWallet(walletAddress: string): Promise<ApiResponse<Project[]>> {
    return apiCall(() => projectDatabaseService.getProjectsByWallet(walletAddress));
  },

  async updateProject(projectId: string, updates: Partial<Project>): Promise<ApiResponse<Project>> {
    return apiCall(() => projectDatabaseService.updateProject(projectId, updates));
  },

  async migrateFromLocalStorage(): Promise<ApiResponse<void>> {
    return apiCall(() => projectDatabaseService.migrateFromLocalStorage());
  }
};

// Messaging API
export const messagingApi = {
  async createConversation(walletAddress1: string, walletAddress2: string): Promise<ApiResponse<Conversation>> {
    return apiCall(() => messagingDatabaseService.createOrGetConversation(walletAddress1, walletAddress2));
  },

  async getConversations(walletAddress: string): Promise<ApiResponse<Conversation[]>> {
    return apiCall(() => messagingDatabaseService.getConversationsForUser(walletAddress));
  },

  async sendMessage(conversationId: string, senderWallet: string, content: string, messageType?: 'text' | 'image' | 'file' | 'system', fileUrl?: string): Promise<ApiResponse<Message>> {
    return apiCall(() => messagingDatabaseService.sendMessage(conversationId, senderWallet, content, messageType, fileUrl));
  },

  async getMessages(conversationId: string, limit?: number, offset?: number): Promise<ApiResponse<Message[]>> {
    return apiCall(() => messagingDatabaseService.getMessagesForConversation(conversationId, limit, offset));
  },

  async markAsRead(conversationId: string, readerWallet: string): Promise<ApiResponse<void>> {
    return apiCall(() => messagingDatabaseService.markMessagesAsRead(conversationId, readerWallet));
  },

  async getUnreadCount(walletAddress: string): Promise<ApiResponse<number>> {
    return apiCall(() => messagingDatabaseService.getUnreadMessageCount(walletAddress));
  },

  async migrateFromLocalStorage(): Promise<ApiResponse<void>> {
    return apiCall(() => messagingDatabaseService.migrateFromLocalStorage());
  }
};

// Migration API
export const migrationApi = {
  async checkDatabaseReady(): Promise<ApiResponse<boolean>> {
    return apiCall(() => migrationService.isDatabaseReady());
  },

  async getStatus(): Promise<ApiResponse<MigrationStatus>> {
    return apiCall(() => Promise.resolve(migrationService.getStatus()));
  },

  async runFullMigration(): Promise<ApiResponse<MigrationStatus>> {
    return apiCall(() => migrationService.runFullMigration());
  },

  async clearLocalStorage(): Promise<ApiResponse<void>> {
    return apiCall(() => migrationService.clearLocalStorageData());
  },

  async restoreFromBackup(): Promise<ApiResponse<void>> {
    return apiCall(() => migrationService.restoreFromBackup());
  }
};

// Utility functions for frontend integration
export const apiUtils = {
  // Force database usage only (no localStorage fallback)
  async shouldUseDatabase(): Promise<boolean> {
    return true; // Always use database for testing
  },

  // No fallback - force database usage for testing
  async withFallback<T>(
    databaseOperation: () => Promise<ApiResponse<T>>,
    _localStorageOperation: () => T,
    _errorMessage: string = 'Operation failed'
  ): Promise<T> {
    const result = await databaseOperation();
    if (result.success && result.data !== undefined) {
      return result.data;
    }
    
    // Throw error instead of falling back to localStorage
    throw new Error(`Database operation failed: ${result.error}`);
  },

  // Handle API errors with user-friendly messages
  handleApiError(error: string): string {
    if (error.includes('connection')) {
      return 'Unable to connect to the database. Please check your internet connection.';
    }
    if (error.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (error.includes('not found')) {
      return 'The requested resource was not found.';
    }
    return error || 'An unexpected error occurred. Please try again.';
  }
};

// Export all APIs as a single object for easy importing
export const api = {
  user: userApi,
  freelancer: freelancerApi,
  job: jobApi,
  project: projectApi,
  messaging: messagingApi,
  migration: migrationApi,
  utils: apiUtils
};
