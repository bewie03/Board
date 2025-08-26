// Platform service for getting dynamic pricing from admin settings
export interface PlatformPricing {
  projectListingFee: number;
  jobListingFee: number;
  projectListingCurrency: 'ADA' | 'BONE';
  jobListingCurrency: 'ADA' | 'BONE';
}

export class PlatformService {
  private static instance: PlatformService;
  private cachedPricing: PlatformPricing | null = null;
  private lastFetch: number = 0;
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): PlatformService {
    if (!PlatformService.instance) {
      PlatformService.instance = new PlatformService();
    }
    return PlatformService.instance;
  }

  async getPlatformPricing(): Promise<PlatformPricing> {
    const now = Date.now();
    
    // Return cached data if still fresh
    if (this.cachedPricing && (now - this.lastFetch) < this.cacheDuration) {
      return this.cachedPricing;
    }

    try {
      const response = await fetch('/api/admin/settings');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      this.cachedPricing = {
        projectListingFee: data.projectListingFee,
        jobListingFee: data.jobListingFee,
        projectListingCurrency: data.projectListingCurrency,
        jobListingCurrency: data.jobListingCurrency,
      };
      this.lastFetch = now;
      
      return this.cachedPricing;
    } catch (error) {
      console.error('Error fetching platform pricing:', error);
      
      // Return default values if API fails
      const defaultPricing: PlatformPricing = {
        projectListingFee: 50,
        jobListingFee: 25,
        projectListingCurrency: 'BONE',
        jobListingCurrency: 'ADA',
      };
      
      return defaultPricing;
    }
  }

  // Clear cache to force refresh
  clearCache(): void {
    this.cachedPricing = null;
    this.lastFetch = 0;
  }
}
