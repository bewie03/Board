import { VercelRequest, VercelResponse } from '@vercel/node';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up expired entries every 30 seconds (more frequent cleanup)
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 30 * 1000);

export const rateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  return (req: VercelRequest, res: VercelResponse, next?: () => void) => {
    const key = getClientKey(req);
    const now = Date.now();
    
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + options.windowMs
      };
    } else {
      store[key].count++;
    }
    
    if (store[key].count > options.max) {
      return res.status(429).json({
        error: options.message || 'Too many requests',
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
      });
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - store[key].count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(store[key].resetTime / 1000));
    
    if (next) next();
  };
};

function getClientKey(req: VercelRequest): string {
  // For reports API, use wallet address if available (more accurate per-user limiting)
  const walletAddress = req.headers['x-wallet-address'] as string;
  if (walletAddress) {
    return `wallet:${walletAddress}`;
  }
  
  // Fallback to IP for other endpoints
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded ? forwarded.split(',')[0] : req.connection?.remoteAddress || 'unknown';
  
  return `ip:${ip}`;
}
