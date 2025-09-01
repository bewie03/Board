// Anti-fraud detection utilities for preventing self-donations
// Uses browser fingerprinting and wallet analysis

interface BrowserFingerprint {
  screen: string;
  timezone: string;
  language: string;
  platform: string;
  userAgent: string;
  canvas: string;
  webgl: string;
  fonts: string[];
  plugins: string[];
}

interface FraudCheckResult {
  isAllowed: boolean;
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high';
  checks: {
    walletMatch: boolean;
    browserFingerprint: boolean;
    localStorage: boolean;
    timing: boolean;
  };
}

class FraudDetectionService {
  private readonly STORAGE_KEY = 'boneboard_project_owners';
  private readonly CONTRIBUTION_HISTORY_KEY = 'boneboard_contributions';
  private readonly FINGERPRINT_KEY = 'boneboard_fingerprint';
  private readonly WALLET_SESSION_KEY = 'boneboard_wallet_sessions';
  private readonly DEVICE_WALLETS_KEY = 'boneboard_device_wallets';

  /**
   * Generate a unique browser fingerprint
   */
  private async generateBrowserFingerprint(): Promise<string> {
    const fingerprint: BrowserFingerprint = {
      screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      userAgent: navigator.userAgent.slice(0, 100), // Truncate for storage
      canvas: this.getCanvasFingerprint(),
      webgl: this.getWebGLFingerprint(),
      fonts: this.getAvailableFonts(),
      plugins: this.getPluginList()
    };

    // Create hash of fingerprint data
    const fingerprintString = JSON.stringify(fingerprint);
    return await this.hashString(fingerprintString);
  }

  /**
   * Generate canvas fingerprint
   */
  private getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'no-canvas';

      canvas.width = 200;
      canvas.height = 50;
      
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('BoneBoard Fingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Anti-fraud detection', 4, 35);

      return canvas.toDataURL().slice(-50); // Last 50 chars for uniqueness
    } catch {
      return 'canvas-error';
    }
  }

  /**
   * Generate WebGL fingerprint
   */
  private getWebGLFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') as WebGLRenderingContext || 
                 canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      if (!gl) return 'no-webgl';

      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      return `${vendor}-${renderer}`.slice(0, 50);
    } catch {
      return 'webgl-error';
    }
  }

  /**
   * Get available fonts (simplified detection)
   */
  private getAvailableFonts(): string[] {
    const testFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
      'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact'
    ];

    const availableFonts: string[] = [];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const baseFonts = ['monospace', 'sans-serif', 'serif'];

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return [];

    for (const font of testFonts) {
      let detected = false;
      for (const baseFont of baseFonts) {
        context.font = `${testSize} ${baseFont}`;
        const baseWidth = context.measureText(testString).width;
        
        context.font = `${testSize} ${font}, ${baseFont}`;
        const testWidth = context.measureText(testString).width;
        
        if (baseWidth !== testWidth) {
          detected = true;
          break;
        }
      }
      if (detected) {
        availableFonts.push(font);
      }
    }

    return availableFonts;
  }

  /**
   * Get plugin list
   */
  private getPluginList(): string[] {
    const plugins: string[] = [];
    for (let i = 0; i < navigator.plugins.length; i++) {
      plugins.push(navigator.plugins[i].name);
    }
    return plugins.slice(0, 10); // Limit to first 10 plugins
  }

  /**
   * Hash a string using Web Crypto API
   */
  private async hashString(str: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    } catch {
      // Fallback simple hash for older browsers
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16).slice(0, 16);
    }
  }

  /**
   * Track wallet address changes in current session
   */
  trackWalletSession(walletAddress: string): void {
    try {
      const stored = localStorage.getItem(this.WALLET_SESSION_KEY);
      const sessions = stored ? JSON.parse(stored) : [];
      
      const now = Date.now();
      const sessionEntry = {
        wallet: walletAddress,
        timestamp: now,
        fingerprint: null // Will be set async
      };
      
      // Add to session history
      sessions.push(sessionEntry);
      
      // Keep only last 24 hours of sessions
      const filtered = sessions.filter((s: any) => now - s.timestamp < 24 * 60 * 60 * 1000);
      
      localStorage.setItem(this.WALLET_SESSION_KEY, JSON.stringify(filtered));
      
      // Also track all wallets used on this device
      this.recordDeviceWallet(walletAddress);
    } catch (error) {
      console.warn('Failed to track wallet session:', error);
    }
  }

  /**
   * Record all wallets used on this device
   */
  private recordDeviceWallet(walletAddress: string): void {
    try {
      const stored = localStorage.getItem(this.DEVICE_WALLETS_KEY);
      const deviceWallets = stored ? JSON.parse(stored) : [];
      
      if (!deviceWallets.includes(walletAddress)) {
        deviceWallets.push(walletAddress);
        localStorage.setItem(this.DEVICE_WALLETS_KEY, JSON.stringify(deviceWallets));
      }
    } catch (error) {
      console.warn('Failed to record device wallet:', error);
    }
  }

  /**
   * Get all wallets that have been used on this device
   */
  private getDeviceWallets(): string[] {
    try {
      const stored = localStorage.getItem(this.DEVICE_WALLETS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get recent wallet sessions (last 24 hours)
   */
  private getRecentWalletSessions(): any[] {
    try {
      const stored = localStorage.getItem(this.WALLET_SESSION_KEY);
      const sessions = stored ? JSON.parse(stored) : [];
      const now = Date.now();
      return sessions.filter((s: any) => now - s.timestamp < 24 * 60 * 60 * 1000);
    } catch {
      return [];
    }
  }

  /**
   * Record project ownership for fraud detection
   */
  recordProjectOwnership(projectId: string, walletAddress: string): void {
    try {
      // Track this wallet session
      this.trackWalletSession(walletAddress);
      
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const owners = stored ? JSON.parse(stored) : {};
      
      if (!owners[projectId]) {
        owners[projectId] = {
          wallet: walletAddress,
          timestamp: Date.now(),
          fingerprint: null, // Will be set when fingerprint is generated
          deviceWallets: this.getDeviceWallets(), // Track all wallets on device at creation time
          sessionWallets: this.getRecentWalletSessions().map(s => s.wallet) // Track session wallets
        };
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(owners));
    } catch (error) {
      console.warn('Failed to record project ownership:', error);
    }
  }

  /**
   * Record browser fingerprint for project owner
   */
  async recordOwnerFingerprint(projectId: string): Promise<void> {
    try {
      const fingerprint = await this.generateBrowserFingerprint();
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const owners = stored ? JSON.parse(stored) : {};
      
      if (owners[projectId]) {
        owners[projectId].fingerprint = fingerprint;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(owners));
      }

      // Also store global fingerprint
      localStorage.setItem(this.FINGERPRINT_KEY, fingerprint);
    } catch (error) {
      console.warn('Failed to record owner fingerprint:', error);
    }
  }

  /**
   * Check if contribution is allowed (main fraud detection method)
   */
  async checkContributionAllowed(
    projectId: string,
    contributorWallet: string,
    projectOwnerWallet: string
  ): Promise<FraudCheckResult> {
    const result: FraudCheckResult = {
      isAllowed: true,
      riskLevel: 'low',
      checks: {
        walletMatch: false,
        browserFingerprint: false,
        localStorage: false,
        timing: false
      }
    };

    // Track this wallet session for future reference
    this.trackWalletSession(contributorWallet);

    // Check 1: Direct wallet address match
    if (contributorWallet.toLowerCase() === projectOwnerWallet.toLowerCase()) {
      result.isAllowed = false;
      result.reason = 'Cannot contribute to your own project';
      result.riskLevel = 'high';
      result.checks.walletMatch = true;
      return result;
    }

    // Check 1.5: Device wallet history (Critical for multi-address detection)
    const deviceWallets = this.getDeviceWallets();
    if (deviceWallets.includes(projectOwnerWallet) && deviceWallets.includes(contributorWallet)) {
      result.isAllowed = false;
      result.reason = 'Cannot contribute: Both project owner and contributor wallets have been used on this device';
      result.riskLevel = 'high';
      result.checks.localStorage = true;
      return result;
    }

    // Check 1.6: Recent wallet switching detection (Vespr multi-address scenario)
    const recentSessions = this.getRecentWalletSessions();
    const last30Minutes = Date.now() - (30 * 60 * 1000);
    const recentWallets = recentSessions
      .filter(s => s.timestamp > last30Minutes)
      .map(s => s.wallet);
    
    if (recentWallets.includes(projectOwnerWallet) && recentWallets.includes(contributorWallet)) {
      result.isAllowed = false;
      result.reason = 'Suspicious activity: Recent wallet switching detected (within 30 minutes)';
      result.riskLevel = 'high';
      result.checks.localStorage = true;
      return result;
    }

    // Check 2: Browser fingerprint match
    try {
      const currentFingerprint = await this.generateBrowserFingerprint();
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const owners = stored ? JSON.parse(stored) : {};
      
      if (owners[projectId]?.fingerprint === currentFingerprint) {
        result.isAllowed = false;
        result.reason = 'Suspicious activity detected: Same device as project owner';
        result.riskLevel = 'high';
        result.checks.browserFingerprint = true;
        return result;
      }

      // Check global fingerprint storage
      const globalFingerprint = localStorage.getItem(this.FINGERPRINT_KEY);
      if (globalFingerprint === currentFingerprint) {
        result.checks.browserFingerprint = true;
        result.riskLevel = 'medium';
      }
    } catch (error) {
      console.warn('Fingerprint check failed:', error);
    }

    // Check 3: Multi-wallet detection (Enhanced for Vespr scenario)
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const owners = stored ? JSON.parse(stored) : {};
      
      // Check if this project was created by any wallet used on this device
      const projectOwnerData = owners[projectId];
      if (projectOwnerData) {
        // Check if contributor wallet was used in same session as project creation
        const deviceWallets = this.getDeviceWallets();
        const recentSessions = this.getRecentWalletSessions();
        
        // Block if contributor wallet has been used on this device
        if (deviceWallets.includes(contributorWallet)) {
          result.isAllowed = false;
          result.reason = 'Cannot contribute: This wallet address has been used on this device before';
          result.riskLevel = 'high';
          result.checks.localStorage = true;
          return result;
        }
        
        // Check for recent wallet switching patterns (within last hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const recentWalletSwitches = recentSessions.filter(s => s.timestamp > oneHourAgo);
        
        if (recentWalletSwitches.length > 1) {
          const walletAddresses = recentWalletSwitches.map(s => s.wallet);
          // If project owner wallet was used recently and now different wallet is contributing
          if (walletAddresses.includes(projectOwnerData.wallet) && 
              walletAddresses.includes(contributorWallet)) {
            result.isAllowed = false;
            result.reason = 'Suspicious activity: Recent wallet switching detected on this device';
            result.riskLevel = 'high';
            result.checks.localStorage = true;
            return result;
          }
        }
      }
      
      // Check if contributor wallet is known as owner of other projects
      for (const [pid, data] of Object.entries(owners as Record<string, any>)) {
        if (data?.wallet?.toLowerCase() === contributorWallet.toLowerCase() && pid !== projectId) {
          result.checks.localStorage = true;
          result.riskLevel = 'medium';
          break;
        }
      }
    } catch (error) {
      console.warn('Multi-wallet check failed:', error);
    }

    // Check 4: Rapid contribution timing (basic implementation)
    try {
      const historyKey = `${this.CONTRIBUTION_HISTORY_KEY}_${contributorWallet}`;
      const history = localStorage.getItem(historyKey);
      const contributions = history ? JSON.parse(history) : [];
      
      const now = Date.now();
      const recentContributions = contributions.filter((c: any) => now - c.timestamp < 60000); // Last minute
      
      if (recentContributions.length > 2) {
        result.checks.timing = true;
        result.riskLevel = result.riskLevel === 'high' ? 'high' : 'medium';
      }

      // Record this contribution attempt
      contributions.push({ projectId, timestamp: now });
      localStorage.setItem(historyKey, JSON.stringify(contributions.slice(-10))); // Keep last 10
    } catch (error) {
      console.warn('Timing check failed:', error);
    }

    // Final risk assessment
    if (result.riskLevel === 'medium' && (result.checks.browserFingerprint || result.checks.localStorage)) {
      result.isAllowed = false;
      result.reason = 'Multiple fraud indicators detected. Please contact support if this is an error.';
      result.riskLevel = 'high';
    }

    return result;
  }

  /**
   * Initialize wallet tracking for current session
   */
  initializeWalletTracking(walletAddress: string): void {
    this.trackWalletSession(walletAddress);
  }

  /**
   * Get fraud detection status for debugging
   */
  getDetectionStatus(): any {
    return {
      deviceWallets: this.getDeviceWallets(),
      recentSessions: this.getRecentWalletSessions(),
      projectOwners: JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}'),
      fingerprint: localStorage.getItem(this.FINGERPRINT_KEY)
    };
  }

  /**
   * Clear fraud detection data (for testing/admin purposes)
   */
  clearFraudData(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.FINGERPRINT_KEY);
      localStorage.removeItem(this.WALLET_SESSION_KEY);
      localStorage.removeItem(this.DEVICE_WALLETS_KEY);
      // Clear contribution history for all wallets
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.CONTRIBUTION_HISTORY_KEY)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear fraud data:', error);
    }
  }
}

export const fraudDetection = new FraudDetectionService();
export type { FraudCheckResult };
