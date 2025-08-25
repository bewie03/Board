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
  walletAddress: string;
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

export interface ServiceType {
  id: string;
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
  socialLinks?: {
    website?: string;
    twitter?: string;
    discord?: string;
    github?: string;
    linkedin?: string;
  };
  workImages?: string[];
  packages?: ServicePackage[];
  startingPrice?: number;
}

export interface FreelancerServiceClass {
  getAllFreelancers(): Promise<Freelancer[]>;
  getFreelancerByWallet(walletAddress: string): Promise<Freelancer | null>;
  createFreelancer(freelancerData: Partial<Freelancer>): Promise<boolean>;
  updateFreelancer(walletAddress: string, updates: Partial<Freelancer>): Promise<boolean>;
  saveServicePackages(walletAddress: string, packages: ServicePackage[]): Promise<boolean>;
}
