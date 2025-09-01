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
   * Record project ownership for fraud detection
   */
  recordProjectOwnership(projectId: string, walletAddress: string): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const owners = stored ? JSON.parse(stored) : {};
      
      if (!owners[projectId]) {
        owners[projectId] = {
          wallet: walletAddress,
          timestamp: Date.now(),
          fingerprint: null // Will be set when fingerprint is generated
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

    // Check 1: Direct wallet address match
    if (contributorWallet.toLowerCase() === projectOwnerWallet.toLowerCase()) {
      result.isAllowed = false;
      result.reason = 'Cannot contribute to your own project';
      result.riskLevel = 'high';
      result.checks.walletMatch = true;
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

    // Check 3: LocalStorage analysis for known project owners
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const owners = stored ? JSON.parse(stored) : {};
      
      // Check if contributor wallet is known as owner of other projects
      for (const [pid, data] of Object.entries(owners as Record<string, any>)) {
        if (data?.wallet?.toLowerCase() === contributorWallet.toLowerCase() && pid !== projectId) {
          result.checks.localStorage = true;
          result.riskLevel = 'medium';
          break;
        }
      }
    } catch (error) {
      console.warn('LocalStorage check failed:', error);
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
   * Clear fraud detection data (for testing/admin purposes)
   */
  clearFraudData(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.FINGERPRINT_KEY);
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
