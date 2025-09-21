import { NextRequest } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 10 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

export function rateLimit(config: RateLimitConfig) {
  return {
    check: async (request: NextRequest, identifier: string) => {
      const now = Date.now();
      const key = `${identifier}:${request.url}`;
      
      if (!store[key] || store[key].resetTime < now) {
        store[key] = {
          count: 1,
          resetTime: now + config.windowMs,
        };
        return { success: true, limit: config.maxRequests, remaining: config.maxRequests - 1 };
      }
      
      store[key].count++;
      
      if (store[key].count > config.maxRequests) {
        return { 
          success: false, 
          limit: config.maxRequests, 
          remaining: 0,
          message: config.message || 'Too many requests'
        };
      }
      
      return { 
        success: true, 
        limit: config.maxRequests, 
        remaining: config.maxRequests - store[key].count 
      };
    }
  };
}

// Predefined rate limiters for different endpoints
export const adminApiLimiter = rateLimit({
  maxRequests: 60, // 60 requests per minute for admin APIs
  windowMs: 60 * 1000,
  message: 'Too many admin API requests, please try again later.'
});

export const uploadLimiter = rateLimit({
  maxRequests: 10, // 10 uploads per minute
  windowMs: 60 * 1000,
  message: 'Too many upload requests, please try again later.'
});

export const bulkImportLimiter = rateLimit({
  maxRequests: 5, // 5 bulk imports per hour
  windowMs: 60 * 60 * 1000,
  message: 'Too many bulk import requests, please try again later.'
});