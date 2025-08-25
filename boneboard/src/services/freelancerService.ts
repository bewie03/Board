import type { Freelancer, FreelancerServiceClass as IFreelancerServiceClass } from 'types/freelancer';

class FreelancerServiceClass implements IFreelancerServiceClass {
  // Get all freelancers from database
  async getAllFreelancers(): Promise<Freelancer[]> {
    try {
      const response = await fetch('/api/freelancers');
      if (!response.ok) {
        throw new Error(`Failed to fetch freelancers: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching freelancers:', error);
      return [];
    }
  }

  // Get freelancer by wallet address from database
  async getFreelancerByWallet(walletAddress: string): Promise<Freelancer | null> {
    try {
      const response = await fetch(`/api/freelancers?walletAddress=${walletAddress}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.freelancer || null;
    } catch (error) {
      console.error('Error fetching freelancer by wallet address:', error);
      return null;
    }
  }

  async getFreelancerById(id: string): Promise<Freelancer | null> {
    try {
      const response = await fetch(`/api/freelancers?id=${id}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.freelancer || null;
    } catch (error) {
      console.error('Error fetching freelancer by ID:', error);
      return null;
    }
  }

  // Create new freelancer in database
  async createFreelancer(freelancerData: Partial<Freelancer>): Promise<boolean> {
    try {
      const response = await fetch('/api/freelancers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(freelancerData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create freelancer: ${response.status} ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating freelancer:', error);
      throw error;
    }
  }

  // Update freelancer in database
  async updateFreelancer(walletAddress: string, updates: any): Promise<boolean> {
    try {
      const response = await fetch(`/api/freelancers?walletAddress=${walletAddress}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update freelancer:', response.status, errorText);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating freelancer:', error);
      return false;
    }
  }

  // Save service packages to database
  async saveServicePackages(walletAddress: string, packages: any[]): Promise<boolean> {
    try {
      console.log('Saving service packages for:', walletAddress, packages);
      
      const response = await fetch(`/api/freelancers?packages=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          servicePackages: packages.map(pkg => ({
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
        console.error('❌ Failed to save packages:', response.status, errorText);
        throw new Error(`Failed to save packages: ${response.status} ${errorText}`);
      }
      
      console.log('✅ Packages saved to database successfully');
      return true;
      
    } catch (error: any) {
      console.error('Error saving service packages:', error);
      throw error;
    }
  }
}

const FreelancerService = new FreelancerServiceClass();
export default FreelancerService;
