// Migration service to move all data from localStorage to PostgreSQL
import { db } from './database';
import { jobDatabaseService } from './jobDatabaseService';
import { projectDatabaseService } from './projectDatabaseService';
import { messagingDatabaseService } from './messagingDatabaseService';

export interface MigrationStatus {
  jobs: { total: number; migrated: number; errors: number };
  projects: { total: number; migrated: number; errors: number };
  messages: { total: number; migrated: number; errors: number };
  reviews: { total: number; migrated: number; errors: number };
  isComplete: boolean;
  errors: string[];
}

export class MigrationService {
  private status: MigrationStatus = {
    jobs: { total: 0, migrated: 0, errors: 0 },
    projects: { total: 0, migrated: 0, errors: 0 },
    messages: { total: 0, migrated: 0, errors: 0 },
    reviews: { total: 0, migrated: 0, errors: 0 },
    isComplete: false,
    errors: []
  };

  // Check if database is ready
  async isDatabaseReady(): Promise<boolean> {
    try {
      return db.isReady();
    } catch (error) {
      console.error('Database not ready:', error);
      return false;
    }
  }

  // Get current migration status
  getStatus(): MigrationStatus {
    return { ...this.status };
  }

  // Run full migration for all data types
  async runFullMigration(): Promise<MigrationStatus> {
    console.log('🚀 Starting full migration from localStorage to PostgreSQL...');
    
    // Reset status
    this.status = {
      jobs: { total: 0, migrated: 0, errors: 0 },
      projects: { total: 0, migrated: 0, errors: 0 },
      messages: { total: 0, migrated: 0, errors: 0 },
      reviews: { total: 0, migrated: 0, errors: 0 },
      isComplete: false,
      errors: []
    };

    try {
      // Migrate data types
      await this.migrateJobs();
      await this.migrateProjects();
      await this.migrateMessages();
      
      console.log('✅ Migration completed successfully!');
      console.log('📊 Final status:', this.status);
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.status.errors.push(`Migration failed: ${error}`);
      throw error;
    }

    this.status.isComplete = true;
    return this.status;
  }

  // Migrate projects
  private async migrateProjects(): Promise<void> {
    try {
      console.log('🏗️ Migrating projects...');
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      this.status.projects.total = projects.length;

      for (const project of projects) {
        try {
          const existing = await projectDatabaseService.getProjectById(project.id);
          if (existing) {
            console.log(`Project ${project.name} already exists, skipping...`);
            continue;
          }

          await projectDatabaseService.createProject(project.walletAddress || project.owner, {
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

          this.status.projects.migrated++;
          console.log(`✅ Migrated project: ${project.name}`);
        } catch (error) {
          this.status.projects.errors++;
          this.status.errors.push(`Project ${project.name}: ${error}`);
          console.error(`❌ Error migrating project ${project.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in project migration:', error);
      throw error;
    }
  }

  // Migrate job listings
  private async migrateJobs(): Promise<void> {
    try {
      console.log('💼 Migrating job listings...');
      const jobListings = JSON.parse(localStorage.getItem('jobListings') || '[]');
      this.status.jobs.total = jobListings.length;

      for (const job of jobListings) {
        try {
          const existing = await jobDatabaseService.getJobById(job.id);
          if (existing) {
            console.log(`Job ${job.title} already exists, skipping...`);
            continue;
          }

          await jobDatabaseService.createJobListing(job.walletAddress, {
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

          this.status.jobs.migrated++;
          console.log(`✅ Migrated job: ${job.title}`);
        } catch (error) {
          this.status.jobs.errors++;
          this.status.errors.push(`Job ${job.title}: ${error}`);
          console.error(`❌ Error migrating job ${job.title}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in job migration:', error);
      throw error;
    }
  }

  // Migrate messages and conversations
  private async migrateMessages(): Promise<void> {
    try {
      console.log('💬 Migrating messages...');
      const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      const messages = JSON.parse(localStorage.getItem('messages') || '[]');
      this.status.messages.total = conversations.length + messages.length;

      // Migrate conversations first
      for (const conversation of conversations) {
        try {
          if (conversation.participant1 && conversation.participant2) {
            await messagingDatabaseService.createOrGetConversation(
              conversation.participant1, 
              conversation.participant2
            );
            this.status.messages.migrated++;
          }
        } catch (error) {
          this.status.messages.errors++;
          this.status.errors.push(`Conversation migration: ${error}`);
        }
      }

      // Then migrate messages
      for (const message of messages) {
        try {
          if (message.sender && message.content) {
            const conv = await messagingDatabaseService.createOrGetConversation(
              message.sender, 
              message.recipient || message.participant2
            );
            await messagingDatabaseService.sendMessage(
              conv.id, 
              message.sender, 
              message.content, 
              message.type || 'text',
              message.fileUrl
            );
            this.status.messages.migrated++;
          }
        } catch (error) {
          this.status.messages.errors++;
          this.status.errors.push(`Message migration: ${error}`);
        }
      }

      console.log(`✅ Migrated ${this.status.messages.migrated} messages and conversations`);
    } catch (error) {
      console.error('Error in message migration:', error);
      throw error;
    }
  }



  // Clear localStorage after successful migration (optional)
  async clearLocalStorageData(): Promise<void> {
    try {
      console.log('🧹 Clearing localStorage data...');
      const keysToKeep = ['migration_backup', 'walletConnection', 'userPreferences'];
      
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ localStorage cleared (kept essential keys)');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  // Restore from backup if needed
  async restoreFromBackup(): Promise<void> {
    try {
      const backup = localStorage.getItem('migration_backup');
      if (!backup) {
        throw new Error('No backup found');
      }

      const backupData = JSON.parse(backup);
      Object.keys(backupData.data).forEach(key => {
        if (key !== 'migration_backup') {
          localStorage.setItem(key, JSON.stringify(backupData.data[key]));
        }
      });

      console.log('✅ Data restored from backup');
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw error;
    }
  }
}

export const migrationService = new MigrationService();
