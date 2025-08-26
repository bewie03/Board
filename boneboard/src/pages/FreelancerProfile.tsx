import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FreelancerService, Freelancer } from '../services/freelancerService';
import { MessageService, MessageAttachment } from '../services/messageService';
import MessagingAgreement from '../components/MessagingAgreement';
import PageTransition from '../components/PageTransition';
import { FaStar, FaClock, FaEdit, FaArrowLeft, FaShare, FaCheckCircle, FaPaperPlane } from 'react-icons/fa';
import { FaEnvelope, FaGlobe, FaTwitter, FaDiscord, FaGithub, FaLinkedin, FaLink, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { toast } from 'react-toastify';

// Mock useWallet hook for development
const useWallet = () => ({
  walletAddress: 'mock-wallet-address',
  username: 'Mock User'
});

const mainLanguages = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Chinese',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
  'Dutch',
  'Swedish',
  'Norwegian',
  'Danish',
  'Finnish',
  'Polish',
  'Czech',
  'Hungarian',
  'Romanian',
  'Bulgarian',
  'Greek',
  'Turkish',
  'Hebrew',
  'Thai',
  'Vietnamese',
  'Indonesian',
  'Malay',
  'Tagalog'
];

interface Review {
  id: string;
  clientName: string;
  clientAvatar: string;
  rating: number;
  comment: string;
  date: string;
  serviceTitle: string;
}

const FreelancerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { walletAddress, username } = useWallet();
  const [freelancer, setFreelancer] = useState<Freelancer | null>(null);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<'basic' | 'standard' | 'premium'>('basic');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFreelancer, setEditedFreelancer] = useState<Freelancer | null>(null);
  const [busyStatus, setBusyStatus] = useState<'available' | 'busy' | 'unavailable'>('available');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [workImages, setWorkImages] = useState<string[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [showMessagingAgreement, setShowMessagingAgreement] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    website: '',
    twitter: '',
    discord: '',
    github: '',
    linkedin: '',
    custom: ''
  });
  const [newSkillInput, setNewSkillInput] = useState('');
  const [showLanguageDropdownProfile, setShowLanguageDropdownProfile] = useState(false);

  // Avatar handling
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (editedFreelancer) {
          const updatedFreelancer = { ...editedFreelancer, avatar: result };
          setEditedFreelancer(updatedFreelancer);
          // Update preview immediately
          setFreelancer(prev => prev ? { ...prev, avatar: result } : null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const loadFreelancer = async () => {
      if (id) {
        try {
          // First try to get freelancer by ID from the service
          const freelancerData = await FreelancerService.getFreelancerById(id);
          if (freelancerData) {
            // Load service packages from database
            let freelancerWithServices: Freelancer = { ...freelancerData, services: [] };
            
            try {
              // Fetch service packages from database
              const packagesResponse = await fetch(`/api/freelancers?id=${freelancerData.id}&packages=true`);
              if (packagesResponse.ok) {
                const packagesData = await packagesResponse.json();
                console.log('Loaded packages data:', packagesData);
                
                if (packagesData.packages && packagesData.packages.length > 0) {
                  // Group packages by service (assuming one service for now)
                  const packagesByType = packagesData.packages.reduce((acc: any, pkg: any) => {
                    acc[pkg.package_type] = {
                      price: pkg.price,
                      currency: pkg.currency,
                      deliveryTime: pkg.delivery_time,
                      description: pkg.description,
                      features: Array.isArray(pkg.features) ? pkg.features : ['Service delivery']
                    };
                    return acc;
                  }, {});
                  
                  console.log('Packages by type:', packagesByType);
                  
                  // Only create service if we have at least one package type
                  if (Object.keys(packagesByType).length > 0) {
                    freelancerWithServices.services = [{
                      id: `${freelancerData.id}-service-0`,
                      freelancerId: freelancerData.id,
                      walletAddress: freelancerData.walletAddress,
                      title: packagesData.packages[0]?.title || `${freelancerData.title} Service`,
                      description: freelancerData.bio || 'Professional service',
                      shortDescription: freelancerData.bio?.substring(0, 100) || 'Professional service',
                      category: freelancerData.category,
                      skills: freelancerData.skills,
                      images: ['https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop'],
                      pricing: {
                        basic: packagesByType.basic || {
                          price: 100,
                          currency: 'ADA',
                          deliveryTime: '7 days',
                          description: 'Basic Package',
                          features: ['Basic service delivery']
                        },
                        standard: packagesByType.standard || {
                          price: 150,
                          currency: 'ADA',
                          deliveryTime: '5 days',
                          description: 'Standard Package',
                          features: ['Enhanced service delivery', 'Priority support']
                        },
                        premium: packagesByType.premium || {
                          price: 200,
                          currency: 'ADA',
                          deliveryTime: '3 days',
                          description: 'Premium Package',
                          features: ['Premium service delivery', 'Priority support', 'Unlimited revisions']
                        }
                      },
                      rating: freelancerData.rating,
                      reviewCount: freelancerData.reviewCount,
                      completedOrders: freelancerData.completedOrders,
                      responseTime: freelancerData.responseTime,
                      isActive: true,
                      createdAt: new Date().toISOString()
                    }];
                  }
                } else {
                  console.log('No packages found in response');
                }
              }
            } catch (error) {
              console.error('Error loading service packages:', error);
            }
            
            // No fallback - let services remain empty if no packages exist
            
            setFreelancer(freelancerWithServices);
            setEditedFreelancer(freelancerWithServices);
            console.log('Wallet comparison:', { 
              currentWallet: walletAddress, 
              freelancerWallet: freelancerWithServices.walletAddress,
              isMatch: walletAddress === freelancerWithServices.walletAddress 
            });
            // Check if current user owns this profile
            const ownerCheck = walletAddress === freelancerWithServices.walletAddress;
            console.log('Setting isOwner to:', ownerCheck);
            setIsOwner(ownerCheck);
            if (freelancerWithServices.services && freelancerWithServices.services.length > 0) {
              setSelectedService(freelancerWithServices.services[0]);
            }
            
            console.log('Loaded freelancer with services:', freelancerWithServices.services?.length || 0, 'services');
            
            // Load social links if they exist
            if ((freelancerData as any).socialLinks) {
              setSocialLinks((freelancerData as any).socialLinks);
            }
            
            // Load work images if they exist
            if ((freelancerData as any).workImages) {
              setWorkImages((freelancerData as any).workImages);
            }
            
            // Load busy status if it exists
            if ((freelancerData as any).busyStatus) {
              setBusyStatus((freelancerData as any).busyStatus);
            }
            
            // Load social links, work images, and busy status from database
            if ((freelancerWithServices as any).social_links) {
              try {
                const parsedSocialLinks = typeof (freelancerWithServices as any).social_links === 'string' 
                  ? JSON.parse((freelancerWithServices as any).social_links) 
                  : (freelancerWithServices as any).social_links;
                setSocialLinks(parsedSocialLinks);
              } catch (e) {
                console.error('Error parsing social links:', e);
              }
            }
            if ((freelancerWithServices as any).work_images) {
              setWorkImages((freelancerWithServices as any).work_images);
            }
            if (freelancerWithServices.busyStatus || (freelancerWithServices as any).busy_status) {
              setBusyStatus(freelancerWithServices.busyStatus || (freelancerWithServices as any).busy_status);
            }
            
            // Load reviews from localStorage
            const storedReviews = localStorage.getItem(`reviews_${id}`);
            if (storedReviews) {
              setReviews(JSON.parse(storedReviews));
            } else {
              setReviews(generateMockReviews(freelancerData));
            }
          }
        } catch (error) {
          console.error('Error loading freelancer:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadFreelancer();
  }, [id, walletAddress]);

  // Listen for package updates and reload data
  useEffect(() => {
    const handlePackagesUpdated = async (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.walletAddress === walletAddress && freelancer) {
        // Reload packages from database
        try {
          const packagesResponse = await fetch(`/api/freelancers?id=${freelancer.id}&packages=true`);
          if (packagesResponse.ok) {
            const packagesData = await packagesResponse.json();
            
            if (packagesData.packages && packagesData.packages.length > 0) {
              const packagesByType = packagesData.packages.reduce((acc: any, pkg: any) => {
                acc[pkg.package_type] = {
                  price: pkg.price,
                  currency: pkg.currency,
                  deliveryTime: pkg.delivery_time,
                  description: pkg.description,
                  features: Array.isArray(pkg.features) ? pkg.features : ['Service delivery']
                };
                return acc;
              }, {});
              
              // Update freelancer services with new packages
              const updatedFreelancer = {
                ...freelancer,
                services: freelancer.services.map(service => ({
                  ...service,
                  pricing: {
                    basic: packagesByType.basic || service.pricing.basic,
                    standard: packagesByType.standard || service.pricing.standard,
                    premium: packagesByType.premium || service.pricing.premium
                  }
                }))
              };
              
              setFreelancer(updatedFreelancer);
              setEditedFreelancer(updatedFreelancer);
              setSelectedService(updatedFreelancer.services[0]);
            }
          }
        } catch (error) {
          console.error('Error reloading packages:', error);
        }
      }
    };

    window.addEventListener('freelancerPackagesUpdated', handlePackagesUpdated);
    
    return () => {
      window.removeEventListener('freelancerPackagesUpdated', handlePackagesUpdated);
    };
  }, [walletAddress, freelancer]);

  // Real-time preview update effect - sync freelancer state with editedFreelancer when editing
  useEffect(() => {
    if (isEditing && editedFreelancer) {
      const previewFreelancer = {
        ...editedFreelancer,
        socialLinks,
        workImages,
        busyStatus
      };
      setFreelancer(previewFreelancer as Freelancer);
    }
  }, [isEditing, editedFreelancer, socialLinks, workImages, busyStatus]);

  const generateMockReviews = (freelancer: Freelancer): Review[] => {
    const mockReviews: Review[] = [
      {
        id: '1',
        clientName: 'John Smith',
        clientAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face',
        rating: 5,
        comment: 'Excellent work! Very professional and delivered exactly what was promised. Highly recommended!',
        date: '2024-01-15',
        serviceTitle: freelancer.services[0]?.title || 'Service'
      },
      {
        id: '2',
        clientName: 'Maria Garcia',
        clientAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face',
        rating: 5,
        comment: 'Amazing experience working with this freelancer. Great communication and top-quality results.',
        date: '2024-01-10',
        serviceTitle: freelancer.services[0]?.title || 'Service'
      },
      {
        id: '3',
        clientName: 'David Wilson',
        clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face',
        rating: 4,
        comment: 'Good work overall. Delivered on time and met all requirements. Would work with again.',
        date: '2024-01-05',
        serviceTitle: freelancer.services[0]?.title || 'Service'
      }
    ];
    return mockReviews.slice(0, Math.min(mockReviews.length, freelancer.reviewCount));
  };

  const handleContactFreelancer = async () => {
    if (!walletAddress || !freelancer?.walletAddress) return;
    
    // Prevent messaging yourself
    if (walletAddress === freelancer.walletAddress) {
      toast.error('You cannot message yourself.');
      return;
    }
    
    // Check if user has set a username before allowing messaging
    if (!username) {
      toast.error('Please set a username in your account settings before using the messaging system.');
      return;
    }
    
    try {
      // Check if user has agreed to messaging terms
      const hasAgreed = localStorage.getItem('messaging_agreement_accepted');
      if (!hasAgreed) {
        setShowMessagingAgreement(true);
        return;
      }

      // Create or get conversation
      const conversation = await MessageService.getOrCreateConversation(walletAddress, freelancer.walletAddress);
      setSelectedConversationId(conversation.id);
      loadConversations();
      setShowMessaging(true);
    } catch (error) {
      if ((error as Error).message === 'MESSAGING_AGREEMENT_REQUIRED') {
        setShowMessagingAgreement(true);
      } else {
        console.error('Error starting conversation:', error);
        toast.error('Failed to start conversation. Please try again.');
      }
    }
  };

  const loadConversations = () => {
    if (!walletAddress) return;
    const userConversations = MessageService.getUserConversations(walletAddress);
    setConversations(userConversations);
  };

  const loadMessages = (conversationId: string) => {
    const conversation = MessageService.getConversation(conversationId);
    if (conversation) {
      const messages = conversation.messages.filter(msg => !msg.isDeleted);
      setCurrentMessages(messages);
      // Mark messages as read
      MessageService.markMessagesAsRead(conversationId, walletAddress!);
    }
  };

  const handleMessagingAgreementAccept = () => {
    localStorage.setItem('messaging_agreement_accepted', 'true');
    setShowMessagingAgreement(false);
    // Retry the contact action
    handleContactFreelancer();
  };

  const handleMessagingAgreementDecline = () => {
    setShowMessagingAgreement(false);
    toast.info('You must agree to the messaging terms to contact freelancers.');
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() && selectedFiles.length === 0) return;
    if (!walletAddress || !selectedConversationId) return;

    try {
      const conversation = conversations.find(c => c.id === selectedConversationId);
      if (!conversation) return;

      const receiverWallet = conversation.participants.find(
        (p: any) => p.walletAddress !== walletAddress
      )?.walletAddress;

      if (!receiverWallet) return;

      await MessageService.sendMessage(
        walletAddress,
        receiverWallet,
        messageInput.trim(),
        selectedFiles.length > 0 ? selectedFiles : undefined
      );

      setMessageInput('');
      setSelectedFiles([]);
      setIsTyping(false);
      loadMessages(selectedConversationId);
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleEditMessage = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    setEditingContent(currentContent);
  };

  const handleSaveEdit = () => {
    if (!editingMessageId || !walletAddress) return;
    
    const success = MessageService.editMessage(editingMessageId, editingContent, walletAddress);
    if (success) {
      setEditingMessageId(null);
      setEditingContent('');
      if (selectedConversationId) {
        loadMessages(selectedConversationId);
      }
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!walletAddress) return;
    
    const success = MessageService.deleteMessage(messageId, walletAddress);
    if (success && selectedConversationId) {
      loadMessages(selectedConversationId);
    }
  };

  const handleDeleteConversation = () => {
    if (!selectedConversationId || !walletAddress) return;
    
    const success = MessageService.deleteConversation(selectedConversationId, walletAddress);
    if (success) {
      setSelectedConversationId(null);
      setCurrentMessages([]);
      loadConversations();
    }
  };


  // Load conversations when messaging opens
  React.useEffect(() => {
    if (showMessaging && walletAddress) {
      loadConversations();
    }
  }, [showMessaging, walletAddress]);

  // Load messages when conversation changes
  React.useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    }
  }, [selectedConversationId]);


  const handleShare = async () => {
    if (navigator.share && freelancer) {
      try {
        await navigator.share({
          title: `${freelancer.name} - ${freelancer.title}`,
          text: freelancer.bio,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Profile link copied to clipboard!');
  };

  const toggleBusyStatus = async () => {
    if (!freelancer || !isOwner || !walletAddress) return;
    
    let newStatus: 'available' | 'busy' | 'unavailable';
    let statusText: string;
    
    switch (busyStatus) {
      case 'available':
        newStatus = 'busy';
        statusText = 'Busy';
        break;
      case 'busy':
        newStatus = 'unavailable';
        statusText = 'Unavailable';
        break;
      case 'unavailable':
        newStatus = 'available';
        statusText = 'Available';
        break;
    }
    
    setBusyStatus(newStatus);
    
    const updatedFreelancer = {
      ...freelancer,
      busyStatus: newStatus,
      isOnline: newStatus === 'available'
    };
    
    setFreelancer(updatedFreelancer);
    setEditedFreelancer(updatedFreelancer);
    
    // Update freelancer profile in database
    try {
      await FreelancerService.updateFreelancerProfile(walletAddress, {
        busyStatus: newStatus,
        isOnline: newStatus === 'available'
      });
    } catch (error) {
      console.error('Error updating busy status in database:', error);
    }
    
    // Save to individual freelancer storage
    localStorage.setItem(`freelancer_${walletAddress}`, JSON.stringify(updatedFreelancer));
    
    // Update the freelancerProfiles array in localStorage
    try {
      const stored = localStorage.getItem('freelancerProfiles');
      if (stored) {
        const profiles = JSON.parse(stored);
        const profileIndex = profiles.findIndex((p: any) => p.walletAddress === walletAddress);
        if (profileIndex !== -1) {
          profiles[profileIndex] = {
            ...profiles[profileIndex],
            isOnline: newStatus === 'available',
            busyStatus: newStatus
          };
          localStorage.setItem('freelancerProfiles', JSON.stringify(profiles));
        }
      }
    } catch (error) {
      console.error('Error updating freelancerProfiles with status:', error);
    }
    
    // Dispatch events to notify other components
    window.dispatchEvent(new CustomEvent('freelancerUpdated', { 
      detail: { walletAddress: walletAddress, updatedData: updatedFreelancer }
    }));
    
    window.dispatchEvent(new CustomEvent('freelancerStatusUpdated', {
      detail: { walletAddress: walletAddress, status: newStatus }
    }));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: `freelancer_${walletAddress}`,
      newValue: JSON.stringify(updatedFreelancer),
      storageArea: localStorage
    }));
    
    toast.success(`Status updated to ${statusText}`);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleEditToggle = async () => {
    if (isEditing && editedFreelancer) {
      setIsSaving(true);
      // Save changes
      const updatedFreelancer = { 
        ...editedFreelancer, 
        socialLinks,
        workImages,
        busyStatus
      };
      
      // Update the main freelancer state immediately for real-time preview
      setFreelancer(updatedFreelancer);
      
      // Save to database via API - only send essential fields to avoid 413 error
      try {
        const essentialFields = {
          name: updatedFreelancer.name,
          title: updatedFreelancer.title,
          bio: updatedFreelancer.bio,
          category: updatedFreelancer.category,
          skills: updatedFreelancer.skills,
          languages: updatedFreelancer.languages,
          socialLinks,
          workImages,
          busyStatus
        };
        
        const response = await fetch(`/api/freelancers?walletAddress=${updatedFreelancer.walletAddress}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(essentialFields)
        });
        if (!response.ok) throw new Error('API update failed');
        console.log('Freelancer updated successfully via API');
      } catch (error) {
        console.error('Error updating freelancer via API:', error);
        // Fallback to local service
        await FreelancerService.updateFreelancer(updatedFreelancer.walletAddress, updatedFreelancer);
      }
      
      // Save service packages separately to ensure database persistence
      if (updatedFreelancer.services && updatedFreelancer.services.length > 0) {
        try {
          const packages = updatedFreelancer.services.map(service => ({
            name: service.title,
            description: service.description,
            category: service.category,
            price: service.pricing.basic.price,
            deliveryDays: parseInt(service.pricing.basic.deliveryTime.replace(/\D/g, '')) || 7,
            features: service.pricing.basic.features,
            // Include all package tiers
            basicPrice: service.pricing.basic.price,
            basicDeliveryTime: service.pricing.basic.deliveryTime,
            basicFeatures: Array.isArray(service.pricing.basic.features) ? service.pricing.basic.features.slice(0, 5) : [],
            standardPrice: service.pricing.standard.price,
            standardDeliveryTime: service.pricing.standard.deliveryTime,
            standardFeatures: Array.isArray(service.pricing.standard.features) ? service.pricing.standard.features.slice(0, 5) : [],
            premiumPrice: service.pricing.premium.price,
            premiumDeliveryTime: service.pricing.premium.deliveryTime,
            premiumFeatures: Array.isArray(service.pricing.premium.features) ? service.pricing.premium.features.slice(0, 5) : []
          }));
          
          const success = await FreelancerService.saveServicePackages(updatedFreelancer.walletAddress, packages);
          if (success) {
            console.log('✅ Service packages saved successfully');
          } else {
            console.warn('⚠️ Service packages save failed');
          }
        } catch (packageError) {
          console.error('❌ Error saving service packages:', packageError);
        }
      }
      
      // Profile saved to database via API call above - no localStorage needed
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('freelancerUpdated', { 
        detail: { walletAddress: updatedFreelancer.walletAddress, updatedData: updatedFreelancer }
      }));
      
      // Reload freelancer data from database to ensure UI is in sync
      try {
        const reloadedData = await FreelancerService.getFreelancerById(updatedFreelancer.id);
        if (reloadedData) {
          // Load service packages from database after save
          let freelancerWithServices: Freelancer = { ...reloadedData, services: [] };
          
          try {
            // Fetch service packages from database
            const packagesResponse = await fetch(`/api/freelancers?id=${reloadedData.id}&packages=true`);
            if (packagesResponse.ok) {
              const packagesData = await packagesResponse.json();
              console.log('Reloaded packages data:', packagesData);
              
              if (packagesData.packages && packagesData.packages.length > 0) {
                // Group packages by service (assuming one service for now)
                const packagesByType = packagesData.packages.reduce((acc: any, pkg: any) => {
                  acc[pkg.package_type] = {
                    price: pkg.price,
                    currency: pkg.currency,
                    deliveryTime: pkg.delivery_time,
                    description: pkg.description,
                    features: Array.isArray(pkg.features) ? pkg.features : ['Service delivery']
                  };
                  return acc;
                }, {});
                
                console.log('Reloaded packages by type:', packagesByType);
                
                // Only create service if we have at least one package type
                if (Object.keys(packagesByType).length > 0) {
                  freelancerWithServices.services = [{
                    id: `${reloadedData.id}-service-0`,
                    freelancerId: reloadedData.id,
                    walletAddress: reloadedData.walletAddress,
                    title: packagesData.packages[0]?.title || `${reloadedData.title} Service`,
                    description: reloadedData.bio || 'Professional service',
                    shortDescription: reloadedData.bio?.substring(0, 100) || 'Professional service',
                    category: reloadedData.category,
                    skills: reloadedData.skills,
                    images: ['https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop'],
                    pricing: {
                      basic: packagesByType.basic || {
                        price: 100,
                        currency: 'ADA',
                        deliveryTime: '7 days',
                        description: 'Basic Package',
                        features: ['Basic service delivery']
                      },
                      standard: packagesByType.standard || {
                        price: 150,
                        currency: 'ADA',
                        deliveryTime: '5 days',
                        description: 'Standard Package',
                        features: ['Enhanced service delivery', 'Priority support']
                      },
                      premium: packagesByType.premium || {
                        price: 200,
                        currency: 'ADA',
                        deliveryTime: '3 days',
                        description: 'Premium Package',
                        features: ['Premium service delivery', 'Priority support', 'Unlimited revisions']
                      }
                    },
                    rating: reloadedData.rating,
                    reviewCount: reloadedData.reviewCount,
                    completedOrders: reloadedData.completedOrders,
                    responseTime: reloadedData.responseTime,
                    isActive: true,
                    createdAt: new Date().toISOString()
                  }];
                }
              }
            }
          } catch (error) {
            console.error('Error loading service packages after save:', error);
          }
          
          // Load social links, work images, and busy status from reloaded database data
          if ((reloadedData as any).social_links) {
            try {
              const parsedSocialLinks = typeof (reloadedData as any).social_links === 'string' 
                ? JSON.parse((reloadedData as any).social_links) 
                : (reloadedData as any).social_links;
              setSocialLinks(parsedSocialLinks);
            } catch (e) {
              console.error('Error parsing social links on reload:', e);
            }
          }
          if ((reloadedData as any).work_images) {
            setWorkImages((reloadedData as any).work_images);
          }
          if ((reloadedData as any).busy_status) {
            setBusyStatus((reloadedData as any).busy_status);
          }
          
          setFreelancer(freelancerWithServices);
          setEditedFreelancer(freelancerWithServices);
          if (freelancerWithServices.services && freelancerWithServices.services.length > 0) {
            setSelectedService(freelancerWithServices.services[0]);
          }
        }
      } catch (error) {
        console.error('Error reloading freelancer data:', error);
      }
      
      // Trigger storage event for main profiles array to ensure mini profile sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'freelancerProfiles',
        newValue: localStorage.getItem('freelancerProfiles'),
        storageArea: localStorage
      }));
      
      toast.success('Profile updated successfully!');
      setIsSaving(false);
    } else if (!isEditing && freelancer) {
      // Entering edit mode - sync editedFreelancer with current freelancer state
      setEditedFreelancer({
        ...freelancer,
        socialLinks,
        workImages,
        busyStatus
      } as any);
    }
    
    setIsEditing(!isEditing);
  };

  const handleSubmitReview = () => {
    if (!freelancer || isOwner) return;
    
    const review: Review = {
      id: Date.now().toString(),
      clientName: 'Anonymous User', // In real app, get from wallet/profile
      clientAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face',
      rating: newReview.rating,
      comment: newReview.comment,
      date: new Date().toISOString().split('T')[0],
      serviceTitle: selectedService?.title || 'General Service'
    };
    
    const updatedReviews = [review, ...reviews];
    setReviews(updatedReviews);
    localStorage.setItem(`reviews_${id}`, JSON.stringify(updatedReviews));
    
    // Update freelancer rating
    const newRating = updatedReviews.reduce((acc, r) => acc + r.rating, 0) / updatedReviews.length;
    const updatedFreelancer = { 
      ...freelancer, 
      rating: Math.round(newRating * 10) / 10,
      reviewCount: updatedReviews.length 
    };
    setFreelancer(updatedFreelancer);
    FreelancerService.updateFreelancer(freelancer.walletAddress, updatedFreelancer);
    
    setShowReviewForm(false);
    setNewReview({ rating: 5, comment: '' });
    toast.success('Review submitted successfully!');
  };

  const nextImage = () => {
    if (workImages.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % workImages.length);
    }
  };

  const prevImage = () => {
    if (workImages.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + workImages.length) % workImages.length);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading freelancer profile...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!freelancer) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Freelancer Not Found</h2>
            <p className="text-gray-600 mb-6">The freelancer profile you're looking for doesn't exist.</p>
            <button
              onClick={() => navigate('/freelancers')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Freelancers
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate('/freelancers')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            Back to Freelancers
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Freelancer Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Header */}
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="flex items-start space-x-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                      <img
                        src={freelancer.avatar}
                        alt={freelancer.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {isEditing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full cursor-pointer hover:bg-opacity-60 transition-opacity">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <FaEdit className="text-white text-lg pointer-events-none" />
                      </div>
                    )}
                    <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-white ${
                      busyStatus === 'available' ? 'bg-green-500' : 
                      busyStatus === 'busy' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">{freelancer.name}</h1>
                        <p className="text-xl text-gray-600 mt-1">{freelancer.title}</p>
                        {isEditing ? (
                          <div className="mt-2">
                            <select
                              value={editedFreelancer?.category || ''}
                              onChange={(e) => setEditedFreelancer(prev => prev ? {
                                ...prev,
                                category: e.target.value
                              } : null)}
                              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white shadow-sm hover:border-gray-400 transition-colors min-w-48"
                            >
                              <option value="">Select Category</option>
                              <option value="Web Development">Web Development</option>
                              <option value="Mobile Development">Mobile Development</option>
                              <option value="Blockchain Development">Blockchain Development</option>
                              <option value="Design">Design</option>
                              <option value="Marketing">Marketing</option>
                              <option value="Content Writing">Content Writing</option>
                              <option value="Consulting">Consulting</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        ) : freelancer.category ? (
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full mt-2">
                            {freelancer.category}
                          </span>
                        ) : null}
                        <div className="flex items-center mt-3 space-x-4 flex-wrap">
                          <div className="flex items-center">
                            <FaStar className="text-yellow-400 mr-1" />
                            <span className="font-semibold">{freelancer.rating}</span>
                            <span className="text-gray-500 ml-1">({freelancer.reviewCount}&nbsp;reviews)</span>
                          </div>
                          {!isEditing ? (
                            <div className="flex items-center text-gray-600 text-sm">
                              <FaGlobe className="mr-2 text-sm flex-shrink-0" />
                              <span>{freelancer.languages.join(', ')}</span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {editedFreelancer?.languages.map((language, index) => (
                                <div key={index} className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                                  <FaGlobe className="mr-1 text-sm" />
                                  <span className="mr-1">{language}</span>
                                  <button
                                    onClick={() => setEditedFreelancer(prev => prev ? {
                                      ...prev,
                                      languages: prev.languages.filter((_, i) => i !== index)
                                    } : null)}
                                    className="text-red-500 hover:text-red-700 font-bold text-xs"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setShowLanguageDropdownProfile(!showLanguageDropdownProfile)}
                                  className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 px-3 py-2 rounded-lg text-sm transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                  <FaGlobe className="mr-2 text-sm text-blue-500" />
                                  <span className="text-blue-700 font-medium">Add language</span>
                                  <svg className={`w-4 h-4 ml-2 text-blue-500 transition-transform duration-200 ${showLanguageDropdownProfile ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                
                                {showLanguageDropdownProfile && (
                                  <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto min-w-52 backdrop-blur-sm">
                                    <div className="p-2">
                                      <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">Select a language</div>
                                      {mainLanguages
                                        .filter(lang => !editedFreelancer?.languages.includes(lang))
                                        .map(language => (
                                        <button
                                          key={language}
                                          type="button"
                                          onClick={() => {
                                            setEditedFreelancer(prev => prev ? {
                                              ...prev,
                                              languages: [...prev.languages, language]
                                            } : null);
                                            setShowLanguageDropdownProfile(false);
                                          }}
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors flex items-center"
                                        >
                                          <FaGlobe className="mr-2 text-xs text-gray-400" />
                                          {language}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {isOwner && (
                          <>
                            <button 
                              onClick={handleEditToggle}
                              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <FaEdit className="mr-2" />
                              {isSaving ? 'Saving...' : (isEditing ? 'Save' : 'Edit')}
                            </button>
                            <button 
                              onClick={toggleBusyStatus}
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                busyStatus === 'available' 
                                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                                  : busyStatus === 'busy'
                                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                  : 'bg-red-500 hover:bg-red-600 text-white'
                              }`}
                            >
                              {busyStatus === 'available' ? (
                                <>Available</>
                              ) : busyStatus === 'busy' ? (
                                <>Busy</>
                              ) : (
                                <>Unavailable</>
                              )}
                            </button>
                            <button 
                              onClick={() => setShowMessaging(true)}
                              className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              <FaEnvelope className="mr-2" />
                              Messages
                            </button>
                          </>
                        )}
                        <button 
                          onClick={handleShare}
                          className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <FaShare />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{freelancer.completedOrders}</div>
                    <div className="text-sm text-gray-500">Orders Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{freelancer.responseTime}</div>
                    <div className="text-sm text-gray-500">Avg. Response Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {new Date().getFullYear() - new Date(freelancer.memberSince).getFullYear()}y
                    </div>
                    <div className="text-sm text-gray-500">Member Since</div>
                  </div>
                </div>
              </div>

              {/* About */}
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                {isEditing ? (
                  <div className="relative">
                    <textarea
                      value={editedFreelancer?.bio || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 600) {
                          setEditedFreelancer(prev => prev ? {...prev, bio: value} : null);
                        }
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6"
                      rows={4}
                      placeholder="Tell clients about yourself..."
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                      {(editedFreelancer?.bio || '').length}/600
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 leading-relaxed mb-6">{freelancer.bio}</p>
                )}
                
                
                {/* Skills Section */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Skills</h3>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {editedFreelancer?.skills.map((skill, index) => (
                          <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-3 py-2 rounded-lg">
                            <span className="mr-2">{skill}</span>
                            <button
                              onClick={() => setEditedFreelancer(prev => prev ? {
                                ...prev,
                                skills: prev.skills.filter((_, i) => i !== index)
                              } : null)}
                              className="text-red-500 hover:text-red-700 font-bold"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center bg-gray-100 px-3 py-2 rounded-lg">
                          <input
                            type="text"
                            value={newSkillInput}
                            onChange={(e) => setNewSkillInput(e.target.value)}
                            placeholder={`Add new skill... (${(editedFreelancer?.skills.length || 0)}/10)`}
                            className="bg-transparent border-none outline-none text-sm flex-1"
                            disabled={(editedFreelancer?.skills.length || 0) >= 10}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && newSkillInput.trim() && (editedFreelancer?.skills.length || 0) < 10) {
                                setEditedFreelancer(prev => prev ? {
                                  ...prev,
                                  skills: [...prev.skills, newSkillInput.trim()]
                                } : null);
                                setNewSkillInput('');
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              if (newSkillInput.trim() && (editedFreelancer?.skills.length || 0) < 10) {
                                setEditedFreelancer(prev => prev ? {
                                  ...prev,
                                  skills: [...prev.skills, newSkillInput.trim()]
                                } : null);
                                setNewSkillInput('');
                              }
                            }}
                            className={`ml-1 ${(editedFreelancer?.skills.length || 0) >= 10 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'}`}
                            disabled={(editedFreelancer?.skills.length || 0) >= 10}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {freelancer.skills.map((skill, index) => (
                        <span key={index} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-shadow">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Social Links */}
                {(socialLinks.website || socialLinks.twitter || socialLinks.discord || socialLinks.github || socialLinks.linkedin || socialLinks.custom || isEditing) && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Links</h3>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center space-x-2">
                          <FaGlobe className="text-gray-400" />
                          <input
                            type="text"
                            placeholder="Website URL"
                            value={socialLinks.website}
                            onChange={(e) => setSocialLinks(prev => ({...prev, website: e.target.value}))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <FaTwitter className="text-gray-400" />
                          <input
                            type="text"
                            placeholder="X (Twitter) URL"
                            value={socialLinks.twitter}
                            onChange={(e) => setSocialLinks(prev => ({...prev, twitter: e.target.value}))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <FaDiscord className="text-gray-400" />
                          <input
                            type="text"
                            placeholder="Discord URL"
                            value={socialLinks.discord}
                            onChange={(e) => setSocialLinks(prev => ({...prev, discord: e.target.value}))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <FaGithub className="text-gray-400" />
                          <input
                            type="text"
                            placeholder="GitHub URL"
                            value={socialLinks.github}
                            onChange={(e) => setSocialLinks(prev => ({...prev, github: e.target.value}))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <FaLinkedin className="text-gray-400" />
                          <input
                            type="text"
                            placeholder="LinkedIn URL"
                            value={socialLinks.linkedin}
                            onChange={(e) => setSocialLinks(prev => ({...prev, linkedin: e.target.value}))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <FaLink className="text-gray-400" />
                          <input
                            type="text"
                            placeholder="Custom Link URL"
                            value={socialLinks.custom}
                            onChange={(e) => setSocialLinks(prev => ({...prev, custom: e.target.value}))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {socialLinks.website && (
                        <a href={socialLinks.website} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" title="Website">
                          <FaGlobe className="text-gray-600 w-5 h-5" />
                        </a>
                      )}
                      {socialLinks.twitter && (
                        <a href={socialLinks.twitter} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" title="X (Twitter)">
                          <FaTwitter className="text-gray-600 w-5 h-5" />
                        </a>
                      )}
                      {socialLinks.discord && (
                        <a href={socialLinks.discord} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" title="Discord">
                          <FaDiscord className="text-gray-600 w-5 h-5" />
                        </a>
                      )}
                      {socialLinks.github && (
                        <a href={socialLinks.github} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" title="GitHub">
                          <FaGithub className="text-gray-600 w-5 h-5" />
                        </a>
                      )}
                      {socialLinks.linkedin && (
                        <a href={socialLinks.linkedin} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" title="LinkedIn">
                          <FaLinkedin className="text-gray-600 w-5 h-5" />
                        </a>
                      )}
                      {socialLinks.custom && (
                        <a href={socialLinks.custom} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" title="Custom Link">
                          <FaLink className="text-gray-600 w-5 h-5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
                )}

                {/* Work Examples Gallery */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Work Examples</h3>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            files.forEach(file => {
                              if (workImages.length < 6) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const newImage = event.target?.result as string;
                                  setWorkImages(prev => {
                                    const updated = prev.length < 6 ? [...prev, newImage] : prev;
                                    return updated;
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            });
                          }}
                          className="hidden"
                          id="work-images"
                        />
                        <label htmlFor="work-images" className="cursor-pointer">
                          <div className="text-gray-600">
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <p className="mt-2">Click to upload work examples</p>
                            <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB (Max 6 images)</p>
                            <p className="text-xs text-gray-400 mt-1">{workImages.length}/6 images uploaded</p>
                          </div>
                        </label>
                      </div>
                      {workImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-4">
                          {workImages.map((image, index) => (
                            <div key={index} className="relative">
                              <img src={image} alt={`Work ${index + 1}`} className="w-full aspect-square object-cover rounded-lg" />
                              <button
                                onClick={() => setWorkImages(prev => prev.filter((_, i) => i !== index))}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : workImages.length > 0 ? (
                    <div className="relative">
                      <img 
                        src={workImages[currentImageIndex]} 
                        alt={`Work example ${currentImageIndex + 1}`}
                        className="w-full aspect-[4/3] object-cover rounded-lg"
                      />
                      {workImages.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 text-gray-800 p-3 rounded-full hover:bg-opacity-100 transition-all shadow-lg hover:shadow-xl"
                            title="Previous image"
                          >
                            <FaChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 text-gray-800 p-3 rounded-full hover:bg-opacity-100 transition-all shadow-lg hover:shadow-xl"
                            title="Next image"
                          >
                            <FaChevronRight className="w-4 h-4" />
                          </button>
                          {/* Image counter */}
                          <div className="absolute top-3 right-3 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
                            {currentImageIndex + 1} / {workImages.length}
                          </div>
                        </>
                      )}
                      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        {workImages.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-3 h-3 rounded-full transition-all ${
                              index === currentImageIndex 
                                ? 'bg-white shadow-lg' 
                                : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                            }`}
                            title={`View image ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No work examples uploaded yet</p>
                  )}
                </div>
              </div>


              {/* Reviews */}
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Reviews ({freelancer.reviewCount})
                  </h2>
                  {!isOwner && (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Write Review
                    </button>
                  )}
                </div>
                
                {/* Review Form */}
                {showReviewForm && (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-4">Write a Review</h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                            className={`text-2xl ${
                              star <= newReview.rating ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            <FaStar />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                      <textarea
                        value={newReview.comment}
                        onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Share your experience..."
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleSubmitReview}
                        disabled={!newReview.comment.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit Review
                      </button>
                      <button
                        onClick={() => setShowReviewForm(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-100 pb-6 last:border-b-0">
                      <div className="flex items-start space-x-4">
                        <img
                          src={review.clientAvatar}
                          alt={review.clientName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{review.clientName}</h4>
                              <div className="flex items-center mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <FaStar
                                    key={i}
                                    className={`text-sm ${
                                      i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                                <span className="text-sm text-gray-500 ml-2">
                                  {new Date(review.date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-700">{review.comment}</p>
                          <p className="text-sm text-gray-500 mt-2">Service: {review.serviceTitle}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Service Details & Hiring */}
            <div className="space-y-6">
              {freelancer && freelancer.services && freelancer.services.length > 0 && selectedService && (
                <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8 max-w-full overflow-hidden">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 break-words">
                    {selectedPackage.charAt(0).toUpperCase() + selectedPackage.slice(1)} Package
                  </h3>
                  
                  {/* Package Selection */}
                  <div className="mb-6">
                    <div className="flex border-b overflow-x-auto">
                      {(['basic', 'standard', 'premium'] as const).map((pkg) => (
                        <button
                          key={pkg}
                          onClick={() => setSelectedPackage(pkg)}
                          className={`flex-1 py-3 px-2 text-sm font-medium capitalize transition-colors whitespace-nowrap min-w-0 ${
                            selectedPackage === pkg
                              ? 'border-b-2 border-blue-500 text-blue-600'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {pkg}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Package Details */}
                  <div className="mb-6">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Package Description</label>
                          <input
                            type="text"
                            value={editedFreelancer?.services[0]?.pricing[selectedPackage].description || ''}
                            onChange={(e) => {
                              if (editedFreelancer?.services[0]) {
                                setEditedFreelancer(prev => {
                                  if (!prev) return null;
                                  const updated = { ...prev };
                                  updated.services[0].pricing[selectedPackage].description = e.target.value;
                                  return updated;
                                });
                              }
                            }}
                            className="w-full text-lg font-semibold text-gray-900 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Package description"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                            <input
                              type="number"
                              value={editedFreelancer?.services[0]?.pricing[selectedPackage].price || 0}
                              onChange={(e) => {
                                if (editedFreelancer?.services[0]) {
                                  setEditedFreelancer(prev => {
                                    if (!prev) return null;
                                    const updated = { ...prev };
                                    updated.services[0].pricing[selectedPackage].price = parseInt(e.target.value) || 0;
                                    return updated;
                                  });
                                }
                              }}
                              className="w-full text-lg font-bold text-gray-900 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                            <select
                              value={editedFreelancer?.services[0]?.pricing[selectedPackage].currency || 'ADA'}
                              onChange={(e) => {
                                if (editedFreelancer?.services[0]) {
                                  setEditedFreelancer(prev => {
                                    if (!prev) return null;
                                    const updated = { ...prev };
                                    updated.services[0].pricing[selectedPackage].currency = e.target.value;
                                    return updated;
                                  });
                                }
                              }}
                              className="w-full text-lg font-bold text-gray-900 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="ADA">ADA</option>
                              <option value="FIAT">FIAT</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {selectedService.pricing[selectedPackage].description}
                        </h4>
                        <div className="text-2xl font-bold text-gray-900">
                          {selectedService.pricing[selectedPackage].price} {selectedService.pricing[selectedPackage].currency}
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      {isEditing ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Time</label>
                          <input
                            type="text"
                            value={editedFreelancer?.services[0]?.pricing[selectedPackage].deliveryTime || ''}
                            onChange={(e) => {
                              if (editedFreelancer?.services[0]) {
                                setEditedFreelancer(prev => {
                                  if (!prev) return null;
                                  const updated = { ...prev };
                                  updated.services[0].pricing[selectedPackage].deliveryTime = e.target.value;
                                  return updated;
                                });
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., 3 days"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-600 mb-4">
                          <FaClock className="mr-2" />
                          <span>{selectedService.pricing[selectedPackage].deliveryTime} delivery</span>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Features</label>
                        <div className="space-y-2">
                          {(editedFreelancer?.services[0]?.pricing[selectedPackage].features || []).map((feature, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <FaCheckCircle className="text-green-500 flex-shrink-0" />
                              <input
                                type="text"
                                value={feature}
                                onChange={(e) => {
                                  if (editedFreelancer?.services[0]) {
                                    setEditedFreelancer(prev => {
                                      if (!prev) return null;
                                      const updated = { ...prev };
                                      const newFeatures = [...updated.services[0].pricing[selectedPackage].features];
                                      newFeatures[index] = e.target.value;
                                      updated.services[0].pricing[selectedPackage].features = newFeatures;
                                      return updated;
                                    });
                                  }
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="Feature description"
                              />
                              <button
                                type="button"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              if (editedFreelancer?.services[0] && editedFreelancer.services[0].pricing[selectedPackage].features.length < 5) {
                                setEditedFreelancer(prev => {
                                  if (!prev) return null;
                                  const updatedServices = [...prev.services];
                                  updatedServices[0] = {
                                    ...updatedServices[0],
                                    pricing: {
                                      ...updatedServices[0].pricing,
                                      [selectedPackage]: {
                                        ...updatedServices[0].pricing[selectedPackage],
                                        features: [...updatedServices[0].pricing[selectedPackage].features, '']
                                      }
                                    }
                                  };
                                  return { ...prev, services: updatedServices };
                                });
                              }
                            }}
                            className={`flex items-center text-sm font-medium ${
                              (editedFreelancer?.services?.[0]?.pricing?.[selectedPackage]?.features?.length || 0) >= 5
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-blue-600 hover:text-blue-800'
                            }`}
                            disabled={(editedFreelancer?.services?.[0]?.pricing?.[selectedPackage]?.features?.length || 0) >= 5}
                          >
                            <FaCheckCircle className="mr-2" />
                            Add feature {(editedFreelancer?.services?.[0]?.pricing?.[selectedPackage]?.features?.length || 0) >= 5 && '(Max 5)'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {selectedService.pricing[selectedPackage].features.map((feature: string, index: number) => (
                          <li key={index} className="flex items-center text-gray-700">
                            <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {isOwner ? (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Edit My Profile
                      </button>
                    ) : (
                      <button 
                        onClick={handleContactFreelancer}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Contact Freelancer
                      </button>
                    )}
                  </div>

                  {/* Additional Info */}
                  <div className="mt-6 pt-6 border-t text-sm text-gray-500">
                    <div className="flex justify-between mb-2">
                      <span>Avg. Response Time:</span>
                      <span>{selectedService.responseTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Orders Completed:</span>
                      <span>{selectedService.completedOrders}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Show message if no services */}
              {(!freelancer?.services || freelancer.services.length === 0) && isOwner && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">No Services Available</h3>
                  <p className="text-gray-600 mb-4">
                    You haven't set up any services yet. Services allow clients to hire you with different package options.
                  </p>
                  <button 
                    onClick={() => {
                      // Initialize a default service
                      const defaultService = {
                        id: `${freelancer.id}-service-0`,
                        freelancerId: freelancer.id,
                        walletAddress: freelancer.walletAddress,
                        title: `${freelancer.title} Service`,
                        description: freelancer.bio || 'Professional service',
                        shortDescription: freelancer.bio?.substring(0, 100) || 'Professional service',
                        category: freelancer.category,
                        skills: freelancer.skills,
                        images: ['https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop'],
                        pricing: {
                          basic: {
                            price: 100,
                            currency: 'ADA',
                            deliveryTime: '7 days',
                            description: 'Basic Package',
                            features: ['Basic service delivery', 'Standard support', '1 revision']
                          },
                          standard: {
                            price: 200,
                            currency: 'ADA',
                            deliveryTime: '5 days',
                            description: 'Standard Package',
                            features: ['Enhanced service delivery', 'Priority support', '3 revisions', 'Faster delivery']
                          },
                          premium: {
                            price: 350,
                            currency: 'ADA',
                            deliveryTime: '3 days',
                            description: 'Premium Package',
                            features: ['Premium service delivery', '24/7 support', 'Unlimited revisions', 'Express delivery', 'Additional consultation']
                          }
                        },
                        rating: freelancer.rating,
                        reviewCount: freelancer.reviewCount,
                        completedOrders: freelancer.completedOrders,
                        responseTime: freelancer.responseTime,
                        isActive: true,
                        createdAt: new Date().toISOString()
                      };
                      
                      const updatedFreelancer = {
                        ...freelancer,
                        services: [defaultService]
                      };
                      
                      setFreelancer(updatedFreelancer);
                      setEditedFreelancer(updatedFreelancer);
                      setSelectedService(defaultService);
                      setIsEditing(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Service Packages
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Professional Messaging Modal */}
        {showMessaging && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[700px] flex">
              {/* Left Sidebar - Conversations */}
              <div className="w-1/3 border-r border-gray-200 flex flex-col">
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
                  <p className="text-sm text-gray-500">Your conversations</p>
                </div>
                
                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {conversations.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <p className="text-sm">No conversations yet</p>
                        <p className="text-xs mt-1">Start messaging to see conversations here</p>
                      </div>
                    ) : (
                      conversations.map((conversation) => {
                        const otherParticipant = conversation.participants.find(
                          (p: any) => p.walletAddress !== walletAddress
                        );
                        const lastMessage = conversation.messages
                          .filter((msg: any) => !msg.isDeleted)
                          .slice(-1)[0];
                        const unreadCount = conversation.messages.filter(
                          (msg: any) => msg.receiverId === walletAddress && !msg.isRead && !msg.isDeleted
                        ).length;

                        return (
                          <div 
                            key={conversation.id}
                            onClick={() => setSelectedConversationId(conversation.id)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedConversationId === conversation.id 
                                ? 'bg-blue-50 border border-blue-200' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <img 
                                  src={otherParticipant?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'}
                                  alt={otherParticipant?.name || 'User'}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                                {otherParticipant?.isOnline && (
                                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {otherParticipant?.name || 'Unknown User'}
                                  </p>
                                  <span className="text-xs text-gray-500">
                                    {lastMessage ? MessageService.formatMessageTime(new Date(lastMessage.timestamp)) : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 truncate">
                                  {otherParticipant?.walletAddress?.slice(0, 8)}...{otherParticipant?.walletAddress?.slice(-4)}
                                </p>
                                <p className="text-xs text-gray-500 truncate mt-1">
                                  {lastMessage ? (
                                    lastMessage.attachments && lastMessage.attachments.length > 0 ? 
                                      `📎 ${lastMessage.attachments.length} file(s)` : 
                                      lastMessage.content
                                  ) : 'No messages yet'}
                                </p>
                              </div>
                              {unreadCount > 0 && (
                                <div className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                  {unreadCount > 9 ? '9+' : unreadCount}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right Side - Chat Area */}
              <div className="flex-1 flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  {selectedConversationId ? (() => {
                    const conversation = conversations.find(c => c.id === selectedConversationId);
                    const otherParticipant = conversation?.participants.find(
                      (p: any) => p.walletAddress !== walletAddress
                    );
                    
                    return (
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <img 
                            src={otherParticipant?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'}
                            alt={otherParticipant?.name || 'User'}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          {otherParticipant?.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">
                            {otherParticipant?.name || 'Unknown User'}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm text-gray-600">
                              {otherParticipant?.walletAddress?.slice(0, 8)}...{otherParticipant?.walletAddress?.slice(-4)}
                            </p>
                            {otherParticipant?.isOnline && (
                              <>
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                <span className="text-xs text-green-600">Online</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="text-gray-500">
                      <h4 className="text-lg font-semibold">Select a conversation</h4>
                      <p className="text-sm">Choose a conversation to start messaging</p>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    {selectedConversationId && (
                      <button
                        onClick={handleDeleteConversation}
                        className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete conversation"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => setShowMessaging(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl font-light"
                    >
                      ×
                    </button>
                  </div>
                </div>
                
                {/* Messages Area */}
                <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                  {selectedConversationId ? (
                    <div className="space-y-4">
                      {currentMessages.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          <p className="text-sm">No messages yet</p>
                          <p className="text-xs mt-1">Start the conversation!</p>
                        </div>
                      ) : (
                        currentMessages.map((message, index) => {
                          const isOwn = message.senderId === walletAddress;
                          const showDateSeparator = index === 0 || 
                            new Date(currentMessages[index - 1].timestamp).toDateString() !== new Date(message.timestamp).toDateString();
                          
                          return (
                            <div key={message.id}>
                              {/* Date Separator */}
                              {showDateSeparator && (
                                <div className="flex justify-center mb-4">
                                  <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                                    {new Date(message.timestamp).toLocaleDateString([], { 
                                      weekday: 'long', 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric' 
                                    })}
                                  </span>
                                </div>
                              )}
                              
                              {/* Message */}
                              <div className={`flex items-start space-x-3 ${isOwn ? 'justify-end' : ''}`}>
                                {!isOwn && (
                                  <img 
                                    src={message.senderAvatar || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face`}
                                    alt={message.senderName}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                )}
                                
                                <div className={`group relative max-w-md ${
                                  isOwn ? 'order-first' : ''
                                }`}>
                                  <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                                    isOwn 
                                      ? 'bg-blue-600 text-white rounded-tr-md' 
                                      : 'bg-white text-gray-900 rounded-tl-md'
                                  }`}>
                                    {editingMessageId === message.id ? (
                                      <div className="space-y-2">
                                        <textarea
                                          value={editingContent}
                                          onChange={(e) => setEditingContent(e.target.value)}
                                          className="w-full p-2 text-sm bg-transparent border border-gray-300 rounded resize-none"
                                          rows={2}
                                        />
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={handleSaveEdit}
                                            className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={() => setEditingMessageId(null)}
                                            className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <p className="text-sm">{message.content}</p>
                                        
                                        {/* Attachments */}
                                        {message.attachments && message.attachments.length > 0 && (
                                          <div className="mt-2 space-y-2">
                                            {message.attachments.map((attachment: MessageAttachment) => (
                                              <div key={attachment.id}>
                                                {attachment.type === 'image' ? (
                                                  <img 
                                                    src={attachment.url} 
                                                    alt={attachment.name}
                                                    className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
                                                    onClick={() => window.open(attachment.url, '_blank')}
                                                  />
                                                ) : (
                                                  <div className={`flex items-center space-x-2 p-2 rounded ${
                                                    isOwn ? 'bg-blue-500' : 'bg-gray-100'
                                                  }`}>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                    </svg>
                                                    <span className="text-xs truncate">{attachment.name}</span>
                                                    <button 
                                                      onClick={() => window.open(attachment.url, '_blank')}
                                                      className="text-xs underline"
                                                    >
                                                      Download
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  
                                  {/* Message actions */}
                                  {isOwn && editingMessageId !== message.id && (
                                    <div className="absolute top-0 right-0 -mr-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="flex space-x-1">
                                        <button
                                          onClick={() => handleEditMessage(message.id, message.content)}
                                          title="Edit message"
                                        >
                                          <FaEdit className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteMessage(message.id)}
                                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                                          title="Delete message"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Message info */}
                                  <div className={`flex items-center justify-between mt-1 text-xs ${
                                    isOwn ? 'text-blue-200' : 'text-gray-500'
                                  }`}>
                                    <span>
                                      {message.senderWalletAddress.slice(0, 8)}...{message.senderWalletAddress.slice(-4)}
                                    </span>
                                    <div className="flex items-center space-x-1">
                                      <span>{MessageService.formatMessageTime(new Date(message.timestamp))}</span>
                                      {message.isEdited && <span>(edited)</span>}
                                    </div>
                                  </div>
                                </div>
                                
                                {isOwn && (
                                  <img 
                                    src={message.senderAvatar || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face`}
                                    alt={message.senderName}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      
                      {/* Typing Indicator */}
                      {isTyping && (
                        <div className="flex items-center space-x-3">
                          <img 
                            src={freelancer?.avatar} 
                            alt={freelancer?.name} 
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <div className="bg-white rounded-2xl px-4 py-2 shadow-sm">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-lg font-medium">Select a conversation</p>
                        <p className="text-sm mt-1">Choose a conversation from the sidebar to start messaging</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Message Input */}
                {selectedConversationId && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center bg-blue-50 rounded-lg px-3 py-2 text-sm">
                            <span className="truncate max-w-32">{file.name}</span>
                            <button
                              onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-end space-x-3">
                      <div className="flex-1 relative">
                        <textarea
                          placeholder="Type your message..."
                          value={messageInput}
                          onChange={(e) => {
                            setMessageInput(e.target.value);
                            setIsTyping(e.target.value.length > 0);
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          onBlur={() => setIsTyping(false)}
                          className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={1}
                          style={{ minHeight: '48px', maxHeight: '120px' }}
                        />
                      </div>
                      <button 
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim()}
                        className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaPaperPlane className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>Press Enter to send • Shift+Enter for new line</span>
                      <span>Avg. response: {MessageService.getAverageResponseTime(freelancer?.walletAddress || '')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Messaging Agreement Modal */}
        {showMessagingAgreement && (
          <MessagingAgreement
            onAccept={handleMessagingAgreementAccept}
            onDecline={handleMessagingAgreementDecline}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default FreelancerProfile;
