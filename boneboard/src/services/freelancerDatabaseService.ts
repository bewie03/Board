// Freelancer service with PostgreSQL backend
import { db } from './database';
import { userService } from './userService';

export interface FreelancerProfile {
  id: string;
  userId: string;
  name: string;
  title: string;
  bio?: string;
  avatarUrl?: string;
  category?: string;
  skills: string[];
  languages: string[];
  hourlyRate?: number;
  location?: string;
  timezone?: string;
  rating: number;
  reviewCount: number;
  completedOrders: number;
  responseTime: string;
  memberSince: string;
  isOnline: boolean;
  busyStatus: 'available' | 'busy' | 'unavailable';
  socialLinks: Record<string, string>;
  workImages: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ServicePackage {
  id: string;
  freelancerId: string;
  packageType: 'basic' | 'standard' | 'premium';
  title: string;
  description?: string;
  price: number;
  currency: string;
  deliveryTime?: string;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class FreelancerDatabaseService {
  // Create freelancer profile
  async createFreelancerProfile(walletAddress: string, profileData: Partial<FreelancerProfile>): Promise<FreelancerProfile> {
    try {
      // Ensure user exists
      const user = await userService.createOrGetUser(walletAddress);
      
      const query = `
        INSERT INTO freelancer_profiles (
          user_id, name, title, bio, avatar_url, category, skills, languages,
          hourly_rate, location, timezone, social_links, work_images
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const values = [
        user.id,
        profileData.name,
        profileData.title,
        profileData.bio,
        profileData.avatarUrl,
        profileData.category,
        profileData.skills || [],
        profileData.languages || ['English'],
        profileData.hourlyRate,
        profileData.location,
        profileData.timezone,
        JSON.stringify(profileData.socialLinks || {}),
        profileData.workImages || []
      ];

      const result = await db.query(query, values);
      return this.mapFreelancerFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error creating freelancer profile:', error);
      throw error;
    }
  }

  // Get freelancer by ID
  async getFreelancerById(id: string): Promise<FreelancerProfile | null> {
    try {
      const query = 'SELECT * FROM freelancer_profiles WHERE id = $1';
      const result = await db.query(query, [id]);
      return result.rows.length > 0 ? this.mapFreelancerFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting freelancer by ID:', error);
      return null;
    }
  }

  // Get freelancer by wallet address
  async getFreelancerByWallet(walletAddress: string): Promise<FreelancerProfile | null> {
    try {
      const query = `
        SELECT fp.*, u.wallet_address 
        FROM freelancer_profiles fp
        JOIN users u ON fp.user_id = u.id
        WHERE u.wallet_address = $1
      `;
      const result = await db.query(query, [walletAddress]);
      return result.rows.length > 0 ? this.mapFreelancerFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting freelancer by wallet:', error);
      return null;
    }
  }

  // Get all freelancers - Use backend API instead of direct DB
  async getAllFreelancers(filters?: { category?: string; skills?: string[] }): Promise<FreelancerProfile[]> {
    try {
      // Use backend API instead of direct database connection
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.skills?.length) params.append('skills', filters.skills.join(','));
      
      const response = await fetch(`/api/freelancers?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const freelancers = await response.json();
      return freelancers.map((freelancer: any) => this.mapApiFreelancerToFrontend(freelancer));
    } catch (error) {
      console.error('Error getting freelancers:', error);
      return [];
    }
  }

  // Update freelancer profile
  async updateFreelancerProfile(walletAddress: string, updates: Partial<FreelancerProfile>): Promise<FreelancerProfile> {
    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'userId')
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const values = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'userId')
        .map(key => {
          const value = (updates as any)[key];
          if (key === 'socialLinks') return JSON.stringify(value);
          return value;
        });

      const query = `
        UPDATE freelancer_profiles 
        SET ${setClause}
        FROM users u
        WHERE freelancer_profiles.user_id = u.id AND u.wallet_address = $1
        RETURNING freelancer_profiles.*, u.wallet_address
      `;
      
      const result = await db.query(query, [walletAddress, ...values]);
      return this.mapFreelancerFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error updating freelancer profile:', error);
      throw error;
    }
  }

  // Service package methods
  async createServicePackage(freelancerId: string, packageData: Partial<ServicePackage>): Promise<ServicePackage> {
    try {
      const query = `
        INSERT INTO service_packages (
          freelancer_id, package_type, title, description, price, currency, delivery_time, features
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        freelancerId,
        packageData.packageType,
        packageData.title,
        packageData.description,
        packageData.price,
        packageData.currency || 'ADA',
        packageData.deliveryTime,
        packageData.features || []
      ];

      const result = await db.query(query, values);
      return this.mapServicePackageFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error creating service package:', error);
      throw error;
    }
  }

  async getServicePackages(freelancerId: string): Promise<ServicePackage[]> {
    try {
      const query = 'SELECT * FROM service_packages WHERE freelancer_id = $1 ORDER BY package_type';
      const result = await db.query(query, [freelancerId]);
      return result.rows.map((row: Record<string, any>) => this.mapServicePackageFromDb(row));
    } catch (error) {
      console.error('Error getting service packages:', error);
      return [];
    }
  }

  async updateServicePackage(packageId: string, updates: Partial<ServicePackage>): Promise<ServicePackage> {
    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'freelancerId')
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const values = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'freelancerId')
        .map(key => (updates as any)[key]);

      const query = `
        UPDATE service_packages 
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await db.query(query, [packageId, ...values]);
      return this.mapServicePackageFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error updating service package:', error);
      throw error;
    }
  }

  // Migration method to move data from localStorage
  async migrateFromLocalStorage(): Promise<void> {
    try {
      console.log('Starting freelancer data migration from localStorage...');
      
      // Get data from localStorage
      const freelancerProfiles = JSON.parse(localStorage.getItem('freelancerProfiles') || '[]');
      
      for (const profile of freelancerProfiles) {
        try {
          // Check if already migrated
          const existing = await this.getFreelancerByWallet(profile.walletAddress);
          if (existing) {
            console.log(`Freelancer ${profile.name} already migrated, skipping...`);
            continue;
          }

          // Create freelancer profile
          const newProfile = await this.createFreelancerProfile(profile.walletAddress, {
            name: profile.name,
            title: profile.title,
            bio: profile.bio,
            avatarUrl: profile.avatar,
            category: profile.category,
            skills: profile.skills || [],
            languages: profile.languages || ['English'],
            socialLinks: profile.socialLinks || {},
            workImages: profile.workImages || profile.workExamples || []
          });

          // Create service packages if they exist
          if (profile.packages && Array.isArray(profile.packages)) {
            const packageTypes = ['basic', 'standard', 'premium'] as const;
            for (let i = 0; i < profile.packages.length && i < 3; i++) {
              const pkg = profile.packages[i];
              if (pkg.name && pkg.price) {
                await this.createServicePackage(newProfile.id, {
                  packageType: packageTypes[i],
                  title: pkg.name,
                  description: pkg.description,
                  price: pkg.price,
                  currency: 'ADA',
                  deliveryTime: `${pkg.deliveryDays || 7} days`,
                  features: pkg.features || []
                });
              }
            }
          }

          console.log(`Successfully migrated freelancer: ${profile.name}`);
        } catch (error) {
          console.error(`Error migrating freelancer ${profile.name}:`, error);
        }
      }

      console.log('Freelancer migration completed');
    } catch (error) {
      console.error('Error during freelancer migration:', error);
    }
  }

  private mapApiFreelancerToFrontend(apiFreelancer: any): FreelancerProfile {
    return {
      id: apiFreelancer.id,
      userId: apiFreelancer.userId,
      name: apiFreelancer.name,
      title: apiFreelancer.title,
      bio: apiFreelancer.bio,
      avatarUrl: apiFreelancer.avatarUrl,
      category: apiFreelancer.category,
      skills: apiFreelancer.skills || [],
      languages: apiFreelancer.languages || [],
      hourlyRate: parseFloat(apiFreelancer.hourlyRate) || 0,
      location: apiFreelancer.location,
      timezone: apiFreelancer.timezone,
      rating: parseFloat(apiFreelancer.rating) || 0,
      reviewCount: parseInt(apiFreelancer.reviewCount) || 0,
      completedOrders: parseInt(apiFreelancer.completedOrders) || 0,
      responseTime: apiFreelancer.responseTime || '1 hour',
      memberSince: apiFreelancer.memberSince,
      isOnline: apiFreelancer.isOnline || false,
      busyStatus: apiFreelancer.busyStatus || 'available',
      socialLinks: apiFreelancer.socialLinks || {},
      workImages: apiFreelancer.workImages || [],
      createdAt: apiFreelancer.createdAt,
      updatedAt: apiFreelancer.updatedAt
    };
  }

  private mapFreelancerFromDb(row: Record<string, any>): FreelancerProfile {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      title: row.title,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      category: row.category,
      skills: row.skills || [],
      languages: row.languages || [],
      hourlyRate: parseFloat(row.hourly_rate) || 0,
      location: row.location,
      timezone: row.timezone,
      rating: parseFloat(row.rating) || 0,
      reviewCount: parseInt(row.review_count) || 0,
      completedOrders: parseInt(row.completed_orders) || 0,
      responseTime: row.response_time || '1 hour',
      memberSince: row.member_since,
      isOnline: row.is_online || false,
      busyStatus: row.busy_status || 'available',
      socialLinks: row.social_links || {},
      workImages: row.work_images || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapServicePackageFromDb(row: Record<string, any>): ServicePackage {
    return {
      id: row.id,
      freelancerId: row.freelancer_id,
      packageType: row.package_type,
      title: row.title,
      description: row.description,
      price: parseFloat(row.price),
      currency: row.currency,
      deliveryTime: row.delivery_time,
      features: row.features || [],
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export const freelancerDatabaseService = new FreelancerDatabaseService();
