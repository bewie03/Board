// Job listings service with PostgreSQL backend
import { db } from './database';
import { userService } from './userService';

export interface JobListing {
  id: string;
  userId: string;
  projectId?: string;
  title: string;
  company: string;
  description: string;
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  category: string;
  salary: string;
  salaryType: 'ADA' | 'fiat' | 'custom';
  customPaymentType?: string;
  workArrangement: 'remote' | 'hybrid' | 'onsite';
  requiredSkills: string[];
  additionalInfo: string[];
  companyLogoUrl?: string;
  companyWebsite?: string;
  contactEmail?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  howToApply: string;
  listingDuration: number;
  paymentMethod: 'ADA' | 'BONE';
  paymentAmount: number;
  isFeatured: boolean;
  status: 'active' | 'paused' | 'expired' | 'filled';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}


export class JobDatabaseService {
  // Create job listing
  async createJobListing(walletAddress: string, jobData: Partial<JobListing>): Promise<JobListing> {
    try {
      // Ensure user exists
      const user = await userService.createOrGetUser(walletAddress);
      
      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (jobData.listingDuration || 30));

      const query = `
        INSERT INTO job_listings (
          user_id, project_id, title, company, description, job_type, category,
          salary, salary_type, custom_payment_type, work_arrangement, required_skills,
          additional_info, company_logo_url, company_website, contact_email, website,
          twitter, discord, how_to_apply, listing_duration, payment_method,
          payment_amount, is_featured, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        RETURNING *
      `;
      
      const values = [
        user.id,
        jobData.projectId,
        jobData.title,
        jobData.company,
        jobData.description,
        jobData.jobType,
        jobData.category,
        jobData.salary,
        jobData.salaryType || 'fiat',
        jobData.customPaymentType,
        jobData.workArrangement || 'remote',
        jobData.requiredSkills || [],
        jobData.additionalInfo || [],
        jobData.companyLogoUrl,
        jobData.companyWebsite,
        jobData.contactEmail,
        jobData.website,
        jobData.twitter,
        jobData.discord,
        jobData.howToApply,
        jobData.listingDuration || 30,
        jobData.paymentMethod || 'ADA',
        jobData.paymentAmount,
        jobData.isFeatured || false,
        expiresAt.toISOString()
      ];

      const result = await db.query(query, values);
      return this.mapJobFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error creating job listing:', error);
      throw error;
    }
  }

  // Get all job listings - Use backend API instead of direct DB
  async getAllJobListings(filters?: {
    category?: string;
    jobType?: string;
    workArrangement?: string;
    status?: string;
  }): Promise<JobListing[]> {
    try {
      // Use backend API instead of direct database connection
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.status) params.append('status', filters.status);
      
      const response = await fetch(`/api/jobs?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const jobs = await response.json();
      return jobs.map((job: any) => this.mapApiJobToFrontend(job));
    } catch (error) {
      console.error('Error getting job listings:', error);
      return [];
    }
  }

  // Get job by ID
  async getJobById(jobId: string): Promise<JobListing | null> {
    try {
      const query = `
        SELECT jl.*, u.wallet_address 
        FROM job_listings jl
        JOIN users u ON jl.user_id = u.id
        WHERE jl.id = $1
      `;
      const result = await db.query(query, [jobId]);
      return result.rows.length > 0 ? this.mapJobFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting job by ID:', error);
      return null;
    }
  }

  // Get jobs by user wallet
  async getJobsByWallet(walletAddress: string): Promise<JobListing[]> {
    try {
      const query = `
        SELECT jl.*, u.wallet_address 
        FROM job_listings jl
        JOIN users u ON jl.user_id = u.id
        WHERE u.wallet_address = $1
        ORDER BY jl.created_at DESC
      `;
      const result = await db.query(query, [walletAddress]);
      return result.rows.map((row: Record<string, any>) => this.mapJobFromDb(row));
    } catch (error) {
      console.error('Error getting jobs by wallet:', error);
      return [];
    }
  }

  // Update job listing
  async updateJobListing(jobId: string, updates: Partial<JobListing>): Promise<JobListing> {
    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'userId')
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const values = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'userId')
        .map(key => (updates as any)[key]);

      const query = `
        UPDATE job_listings 
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await db.query(query, [jobId, ...values]);
      return this.mapJobFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error updating job listing:', error);
      throw error;
    }
  }



  // Migration method to move data from localStorage
  async migrateFromLocalStorage(): Promise<void> {
    try {
      console.log('Starting job listings migration from localStorage...');
      
      // Get data from localStorage (jobs are typically stored in a different format)
      const jobListings = JSON.parse(localStorage.getItem('jobListings') || '[]');
      
      for (const job of jobListings) {
        try {
          // Check if already migrated
          const existing = await this.getJobById(job.id);
          if (existing) {
            console.log(`Job ${job.title} already migrated, skipping...`);
            continue;
          }

          // Create job listing
          await this.createJobListing(job.walletAddress, {
            title: job.title,
            company: job.company,
            description: job.description,
            jobType: job.type || 'Full-time',
            category: job.category,
            salary: job.salary,
            salaryType: job.salaryType || 'fiat',
            customPaymentType: job.customPaymentType,
            workArrangement: job.workArrangement || 'remote',
            requiredSkills: job.requiredSkills || [],
            additionalInfo: job.additionalInfo || [],
            companyLogoUrl: job.companyLogo,
            companyWebsite: job.companyWebsite,
            contactEmail: job.contactEmail,
            website: job.website,
            twitter: job.twitter,
            discord: job.discord,
            howToApply: job.howToApply,
            listingDuration: job.duration || 30,
            paymentMethod: job.paymentCurrency || 'ADA',
            paymentAmount: job.paymentAmount || 50,
            isFeatured: job.featured || false
          });

          console.log(`Successfully migrated job: ${job.title}`);
        } catch (error) {
          console.error(`Error migrating job ${job.title}:`, error);
        }
      }

      console.log('Job listings migration completed');
    } catch (error) {
      console.error('Error during job listings migration:', error);
    }
  }

  private mapJobFromDb(row: Record<string, any>): JobListing {
    return {
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      title: row.title,
      company: row.company,
      description: row.description,
      jobType: row.job_type,
      category: row.category,
      salary: row.salary,
      salaryType: row.salary_type,
      customPaymentType: row.custom_payment_type,
      workArrangement: row.work_arrangement,
      requiredSkills: row.required_skills || [],
      additionalInfo: row.additional_info || [],
      companyLogoUrl: row.company_logo_url,
      companyWebsite: row.company_website,
      contactEmail: row.contact_email,
      website: row.website,
      twitter: row.twitter,
      discord: row.discord,
      howToApply: row.how_to_apply,
      listingDuration: row.listing_duration,
      paymentMethod: row.payment_method,
      paymentAmount: parseFloat(row.payment_amount),
      isFeatured: row.is_featured,
      status: row.status,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }


  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // Map API response to frontend format
  private mapApiJobToFrontend(apiJob: any): JobListing {
    return {
      id: apiJob.id,
      userId: apiJob.walletAddress,
      projectId: apiJob.projectId,
      title: apiJob.title,
      company: apiJob.company,
      description: apiJob.description,
      jobType: apiJob.type, // API uses 'type', frontend uses 'jobType'
      category: apiJob.category,
      salary: apiJob.salary,
      salaryType: apiJob.salaryType,
      customPaymentType: apiJob.customPaymentType,
      workArrangement: apiJob.workArrangement,
      requiredSkills: apiJob.requiredSkills ? apiJob.requiredSkills.split(', ').map((skill: string) => skill.replace(/^["']|["']$/g, '').trim()) : [],
      additionalInfo: apiJob.additionalInfo ? apiJob.additionalInfo.split(', ') : [],
      companyLogoUrl: apiJob.companyLogo,
      companyWebsite: apiJob.companyWebsite,
      contactEmail: apiJob.contactEmail,
      website: apiJob.website,
      twitter: apiJob.twitter,
      discord: apiJob.discord,
      howToApply: apiJob.howToApply,
      listingDuration: apiJob.duration,
      paymentMethod: apiJob.paymentCurrency, // API uses 'paymentCurrency', frontend uses 'paymentMethod'
      paymentAmount: apiJob.paymentAmount,
      isFeatured: apiJob.featured,
      status: apiJob.status,
      expiresAt: apiJob.expiresAt,
      createdAt: apiJob.createdAt,
      updatedAt: apiJob.updatedAt || apiJob.createdAt
    };
  }
}

export const jobDatabaseService = new JobDatabaseService();
