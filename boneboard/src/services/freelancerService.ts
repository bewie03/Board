export interface ServicePackage {
  price: number;
  currency: 'ADA' | 'BONE' | string;
  deliveryTime: string;
  description: string;
  features: string[];
}

export interface FreelancerService {
  id: string;
  freelancerId: string;
  walletAddress: string; // Add wallet address to service
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  skills: string[];
  images: string[];
  pricing: {
    basic: ServicePackage;
    standard: ServicePackage;
    premium: ServicePackage;
  };
  rating: number;
  reviewCount: number;
  completedOrders: number;
  responseTime: string;
  isActive: boolean;
  createdAt: string;
}

export interface Freelancer {
  id: string;
  name: string;
  username: string;
  avatar: string;
  title: string;
  bio: string;
  location: string;
  category: string;
  memberSince: string;
  rating: number;
  reviewCount: number;
  completedOrders: number;
  responseTime: string;
  languages: string[];
  skills: string[];
  walletAddress: string;
  isOnline: boolean;
  busyStatus?: 'available' | 'busy' | 'unavailable';
  services: FreelancerService[];
}

class FreelancerServiceClass {
  private freelancers: Freelancer[] = [];

  async getAllFreelancers(): Promise<Freelancer[]> {
    try {
      // First try to fetch from API
      const response = await fetch('/api/freelancers');
      if (response.ok) {
        const apiFreelancers = await response.json();
        console.log('Loaded freelancers from API:', apiFreelancers);
        
        // Transform API data to match frontend interface
        return apiFreelancers.map((freelancer: any) => ({
          id: freelancer.id,
          name: freelancer.name,
          username: (freelancer.name && freelancer.name.toLowerCase().replace(/\s+/g, '_')) || 'user',
          avatar: freelancer.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          title: freelancer.title,
          bio: freelancer.bio,
          location: freelancer.location || '',
          category: freelancer.category || 'Other',
          memberSince: freelancer.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          rating: freelancer.rating || 0,
          reviewCount: freelancer.review_count || 0,
          completedOrders: freelancer.completed_orders || 0,
          responseTime: freelancer.response_time || '24 hours',
          languages: Array.isArray(freelancer.languages) ? freelancer.languages : ['English'],
          skills: Array.isArray(freelancer.skills) ? freelancer.skills : [],
          walletAddress: freelancer.wallet_address,
          isOnline: freelancer.is_online || false,
          busyStatus: freelancer.busy_status || 'available',
          services: [] // Services will be loaded separately if needed
        }));
      }
    } catch (error) {
      console.error('Error fetching freelancers from API:', error);
    }
    
    // Fallback to localStorage if API fails
    const storedProfiles = this.getStoredFreelancers();
    return storedProfiles;
  }

  private getStoredFreelancers(): Freelancer[] {
    try {
      const stored = localStorage.getItem('freelancerProfiles');
      if (!stored) return [];
      
      const profiles = JSON.parse(stored);
      return profiles.map((profile: any) => {
        // Check if there's individual profile data that might have updates
        const individualData = localStorage.getItem(`freelancer_${profile.walletAddress}`);
        let mergedProfile = profile;
        
        if (individualData) {
          try {
            const parsedIndividual = JSON.parse(individualData);
            // Merge the data, prioritizing individual profile updates
            mergedProfile = {
              ...profile,
              ...parsedIndividual,
              // Ensure core creation data is preserved
              id: profile.id,
              walletAddress: profile.walletAddress,
              createdAt: profile.createdAt,
              category: profile.category,
              packages: profile.packages
            };
          } catch (error) {
            console.error('Error parsing individual profile data:', error);
          }
        }
        
        return {
          id: mergedProfile.id,
          name: mergedProfile.name,
          username: mergedProfile.username,
          avatar: mergedProfile.avatar,
          title: mergedProfile.title,
          bio: mergedProfile.bio,
          location: mergedProfile.location || '',
          category: mergedProfile.category || profile.category || '',
          memberSince: mergedProfile.createdAt || new Date().toISOString().split('T')[0],
          rating: mergedProfile.rating || 5.0,
          reviewCount: mergedProfile.reviewCount || 0,
          completedOrders: mergedProfile.completedOrders || 0,
          responseTime: mergedProfile.responseTime || '1 hour',
          languages: mergedProfile.languages || ['English'],
          skills: mergedProfile.skills || [],
          walletAddress: mergedProfile.walletAddress,
          isOnline: mergedProfile.isOnline !== undefined ? mergedProfile.isOnline : true,
          busyStatus: mergedProfile.busyStatus || 'available',
          services: (mergedProfile.packages || profile.packages)?.map((pkg: any, index: number) => ({
            id: `${mergedProfile.id}-service-${index}`,
            freelancerId: mergedProfile.id,
            walletAddress: mergedProfile.walletAddress,
            title: pkg.name,
            description: pkg.description,
            shortDescription: pkg.description.length > 100 ? pkg.description.substring(0, 100) + '...' : pkg.description,
            category: mergedProfile.category || profile.category,
            skills: mergedProfile.skills || [],
            images: (mergedProfile.workImages || mergedProfile.workExamples) && (mergedProfile.workImages || mergedProfile.workExamples).length > 0 ? 
              (mergedProfile.workImages || mergedProfile.workExamples) : 
              ['https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop'],
            pricing: {
              basic: {
                price: pkg.price || 100,
                currency: 'ADA',
                deliveryTime: `${pkg.deliveryDays || 7} days`,
                description: pkg.name,
                features: pkg.features || ['Basic service', 'Standard delivery']
              },
              standard: {
                price: Math.ceil((pkg.price || 100) * 1.5),
                currency: 'ADA',
                deliveryTime: `${Math.ceil((pkg.deliveryDays || 7) * 1.2)} days`,
                description: `Enhanced ${pkg.name}`,
                features: [...(pkg.features || ['Basic service', 'Standard delivery']), 'Priority support']
              },
              premium: {
                price: (pkg.price || 100) * 2,
                currency: 'ADA',
                deliveryTime: `${Math.ceil((pkg.deliveryDays || 7) * 1.5)} days`,
                description: `Premium ${pkg.name}`,
                features: [...(pkg.features || ['Basic service', 'Standard delivery']), 'Priority support', '24/7 availability']
              }
            },
            rating: mergedProfile.rating || 5.0,
            reviewCount: mergedProfile.reviewCount || 0,
            completedOrders: mergedProfile.completedOrders || 0,
            responseTime: mergedProfile.responseTime || '1 hour',
            isActive: true,
            createdAt: mergedProfile.createdAt || new Date().toISOString()
          })) || []
        };
      });
    } catch (error) {
      console.error('Error loading stored freelancers:', error);
      return [];
    }
  }

  // mapCategoryToDisplay function removed since we now use consistent display names

  async getFreelancerByWallet(walletAddress: string): Promise<Freelancer | undefined> {
    const allFreelancers = await this.getAllFreelancers();
    return allFreelancers.find(f => f.walletAddress === walletAddress);
  }

  private cleanupStorage(): void {
    try {
      // Calculate current storage usage
      let totalSize = 0;
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length;
        }
      });
      
      // If we're approaching the 5MB limit (use 4MB as threshold)
      if (totalSize > 4 * 1024 * 1024) {
        console.log('Storage cleanup triggered. Current size:', totalSize);
        
        // Remove old freelancer profiles (keep only 20 most recent)
        const freelancerKeys = keys.filter(key => key.startsWith('freelancer_'));
        if (freelancerKeys.length > 20) {
          const sortedKeys = freelancerKeys
            .map(key => {
              try {
                const data = JSON.parse(localStorage.getItem(key) || '{}');
                return { key, createdAt: data.createdAt || '2020-01-01' };
              } catch {
                return { key, createdAt: '2020-01-01' };
              }
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(20); // Remove oldest entries beyond 20
          
          sortedKeys.forEach(({ key }) => {
            localStorage.removeItem(key);
          });
        }
        
        // Remove old reviews (keep only recent ones)
        const reviewKeys = keys.filter(key => key.startsWith('reviews_'));
        if (reviewKeys.length > 10) {
          reviewKeys.slice(10).forEach(key => {
            localStorage.removeItem(key);
          });
        }
        
        // Remove any corrupted or oversized items
        keys.forEach(key => {
          try {
            const item = localStorage.getItem(key);
            if (item && (item.length > 50000 || item.includes('data:image'))) { // Remove large images and data
              localStorage.removeItem(key);
            }
          } catch (e) {
            localStorage.removeItem(key);
          }
        });
        
        console.log('Storage cleanup completed');
      }
    } catch (error) {
      console.error('Error cleaning up storage:', error);
      // Emergency cleanup - remove all non-essential data
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (!key.startsWith('freelancer_') && key !== 'freelancerProfiles') {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.error('Emergency cleanup failed:', e);
      }
    }
  }

  async updateFreelancerProfile(walletAddress: string, updates: any): Promise<boolean> {
    try {
      console.log('Updating freelancer profile for:', walletAddress, updates);
      
      // Update profile in database
      const response = await fetch(`/api/freelancers?walletAddress=${encodeURIComponent(walletAddress)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to update profile in database:', response.status, errorText);
        throw new Error(`Database update failed: ${response.status} ${errorText}`);
      }
      
      console.log('✅ Profile updated in database successfully');
      
      // Trigger event to refresh freelancer data
      window.dispatchEvent(new CustomEvent('freelancerProfileUpdated', {
        detail: { walletAddress, updates }
      }));
      
      return true;
      
    } catch (error) {
      console.error('❌ Error updating freelancer profile:', error);
      return false;
    }
  }

  updateFreelancer(walletAddress: string, updates: Partial<Freelancer>): boolean {
    let updated = false;
    
    try {
      // Clean up storage first to prevent quota issues
      this.cleanupStorage();
      
      // Update in-memory freelancers array
      const index = this.freelancers.findIndex(f => f.walletAddress === walletAddress);
      if (index !== -1) {
        this.freelancers[index] = { ...this.freelancers[index], ...updates };
        updated = true;
      }
      
      // Update individual profile storage first (most important)
      const individualKey = `freelancer_${walletAddress}`;
      const individualData = localStorage.getItem(individualKey);
      if (individualData) {
        const parsedIndividual = JSON.parse(individualData);
        const updatedIndividual = { ...parsedIndividual, ...updates };
        localStorage.setItem(individualKey, JSON.stringify(updatedIndividual));
        updated = true;
      }
      
      // Update main profiles list for mini profile sync
      const stored = localStorage.getItem('freelancerProfiles');
      if (stored) {
        const profiles = JSON.parse(stored);
        const profileIndex = profiles.findIndex((p: any) => p.walletAddress === walletAddress);
        if (profileIndex !== -1) {
          // Merge updates properly to maintain all fields
          const currentProfile = profiles[profileIndex];
          profiles[profileIndex] = {
            ...currentProfile,
            ...updates,
            // Ensure critical fields are preserved/updated correctly
            id: currentProfile.id,
            walletAddress: currentProfile.walletAddress,
            memberSince: currentProfile.memberSince,
            createdAt: currentProfile.createdAt
          };
          localStorage.setItem('freelancerProfiles', JSON.stringify(profiles));
          updated = true;
        }
      }
      
      // Dispatch comprehensive update events
      if (updated) {
        // Main update event
        window.dispatchEvent(new CustomEvent('freelancerProfileUpdated', {
          detail: { walletAddress, updates }
        }));
        
        // Storage events for cross-component sync
        window.dispatchEvent(new StorageEvent('storage', {
          key: individualKey,
          newValue: localStorage.getItem(individualKey),
          storageArea: localStorage
        }));
        
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'freelancerProfiles',
          newValue: localStorage.getItem('freelancerProfiles'),
          storageArea: localStorage
        }));
      }
      
      return updated;
      
    } catch (error) {
      console.error('Error updating freelancer profile:', error);
      return false;
    }
  }
  
  // Database-only method to save service packages
  async saveServicePackages(walletAddress: string, packages: any[]): Promise<boolean> {
    try {
      console.log('Saving service packages for:', walletAddress, packages);
      
      // Save to database using correct API endpoint and structure
      const response = await fetch('/api/freelancers?packages=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          packages: packages.map(pkg => ({
            service_title: pkg.name || pkg.title || 'Service Package',
            service_description: pkg.description || 'Professional service',
            category: pkg.category || 'Other',
            // Basic tier
            basic_price: pkg.basicPrice || pkg.price || 100,
            basic_currency: 'ADA',
            basic_delivery_days: pkg.basicDeliveryDays || pkg.deliveryDays || 7,
            basic_description: pkg.basicDescription || pkg.name || 'Basic Package',
            basic_features: pkg.basicFeatures || pkg.features || ['Basic service delivery', 'Standard support'],
            // Standard tier
            standard_price: pkg.standardPrice || Math.ceil((pkg.price || 100) * 1.5),
            standard_currency: 'ADA',
            standard_delivery_days: pkg.standardDeliveryDays || Math.ceil((pkg.deliveryDays || 7) * 0.8),
            standard_description: pkg.standardDescription || `Enhanced ${pkg.name || 'Service'}`,
            standard_features: pkg.standardFeatures || [...(pkg.features || ['Basic service delivery']), 'Priority support', '3 revisions'],
            // Premium tier
            premium_price: pkg.premiumPrice || (pkg.price || 100) * 2,
            premium_currency: 'ADA',
            premium_delivery_days: pkg.premiumDeliveryDays || Math.ceil((pkg.deliveryDays || 7) * 0.6),
            premium_description: pkg.premiumDescription || `Premium ${pkg.name || 'Service'}`,
            premium_features: pkg.premiumFeatures || [...(pkg.features || ['Basic service delivery']), 'Priority support', 'Unlimited revisions', 'Express delivery'],
            hourly_rate: pkg.hourlyRate || null,
            is_active: true
          }))
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to save packages to database:', response.status, errorText);
        throw new Error(`Database save failed: ${response.status} ${errorText}`);
      }
      
      console.log('✅ Packages saved to database successfully');
      
      // Trigger event to refresh freelancer data
      window.dispatchEvent(new CustomEvent('freelancerPackagesUpdated', {
        detail: { walletAddress }
      }));
      
      return true;
      
    } catch (error) {
      console.error('❌ Error saving service packages:', error);
      return false;
    }
  }

  async getFreelancerById(id: string): Promise<Freelancer | undefined> {
    const allFreelancers = await this.getAllFreelancers();
    return allFreelancers.find(f => f.id === id);
  }

  addFreelancer(freelancer: Freelancer): void {
    this.freelancers.push(freelancer);
  }

  updateService(walletAddress: string, serviceId: string, updates: Partial<FreelancerService>): boolean {
    const freelancer = this.freelancers.find(f => f.walletAddress === walletAddress);
    if (!freelancer) return false;

    const serviceIndex = freelancer.services.findIndex(s => s.id === serviceId);
    if (serviceIndex === -1) return false;

    freelancer.services[serviceIndex] = { 
      ...freelancer.services[serviceIndex],
      ...updates 
    };
    return true;
  }

  async getFreelancerServices(): Promise<FreelancerService[]> {
    const allFreelancers = await this.getAllFreelancers();
    return allFreelancers.flatMap((freelancer: Freelancer) => freelancer.services);
  }

  async getServiceById(serviceId: string): Promise<FreelancerService | undefined> {
    const services = await this.getFreelancerServices();
    return services.find((service: FreelancerService) => service.id === serviceId);
  }

  async getServicesByCategory(category: string): Promise<FreelancerService[]> {
    const services = await this.getFreelancerServices();
    return services.filter((service: FreelancerService) => service.category === category);
  }

  async searchServices(query: string): Promise<FreelancerService[]> {
    const lowercaseQuery = query.toLowerCase();
    const services = await this.getFreelancerServices();
    return services.filter((service: FreelancerService) =>
      (service.title && service.title.toLowerCase().includes(lowercaseQuery)) ||
      (service.description && service.description.toLowerCase().includes(lowercaseQuery)) ||
      (service.skills && service.skills.some((skill: string) => skill && skill.toLowerCase().includes(lowercaseQuery)))
    );
  }

  async getCategories(): Promise<string[]> {
    // Return consistent categories that match the form
    const defaultCategories = [
      'Web Development',
      'Mobile Development', 
      'Blockchain Development',
      'Design',
      'Marketing',
      'Content Writing',
      'Consulting',
      'Other'
    ];
    
    // Get categories from actual services
    const services = await this.getFreelancerServices();
    const serviceCategories = services.map((service: FreelancerService) => service.category);
    const uniqueServiceCategories = [...new Set(serviceCategories)];
    
    // Merge and deduplicate
    const allCategories = [...new Set([...defaultCategories, ...uniqueServiceCategories])];
    return allCategories;
  }

}

export const FreelancerService = new FreelancerServiceClass();
