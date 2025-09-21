/**
 * Security Headers Configuration
 * Implements comprehensive security headers for the 1001 Stories platform
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Content Security Policy directives
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'", // Required for development
    'https://cdn.jsdelivr.net',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://js.stripe.com',
    'https://www.paypal.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind
    'https://fonts.googleapis.com',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://*.googleusercontent.com',
    'https://*.githubusercontent.com',
    'https://res.cloudinary.com',
  ],
  'media-src': ["'self'"],
  'connect-src': [
    "'self'",
    'https://api.stripe.com',
    'https://api.paypal.com',
    'https://www.google-analytics.com',
    'https://vitals.vercel-insights.com',
  ],
  'frame-src': [
    "'self'",
    'https://js.stripe.com',
    'https://www.paypal.com',
  ],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'object-src': ["'none'"],
  'worker-src': ["'self'", 'blob:'],
  'manifest-src': ["'self'"],
};

// Generate CSP string
function generateCSP(isDevelopment: boolean): string {
  const directives = { ...CSP_DIRECTIVES };
  
  // Relax CSP for development
  if (isDevelopment) {
    directives['script-src'].push("'unsafe-eval'");
    directives['connect-src'].push('ws://localhost:*', 'http://localhost:*');
  }
  
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

// Security headers configuration
export function getSecurityHeaders(isDevelopment = false): Record<string, string> {
  const headers: Record<string, string> = {
    // Content Security Policy
    'Content-Security-Policy': generateCSP(isDevelopment),
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Enable XSS protection
    'X-XSS-Protection': '1; mode=block',
    
    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy (formerly Feature Policy)
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=(self https://js.stripe.com https://www.paypal.com)',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', '),
    
    // DNS Prefetch Control
    'X-DNS-Prefetch-Control': 'on',
    
    // Download Options (IE specific)
    'X-Download-Options': 'noopen',
    
    // Permitted Cross-Domain Policies
    'X-Permitted-Cross-Domain-Policies': 'none',
  };
  
  // Add HSTS for production
  if (!isDevelopment) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }
  
  return headers;
}

// Apply security headers to response
export function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const headers = getSecurityHeaders(isDevelopment);
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Add CORS headers if needed
  const origin = request.headers.get('origin');
  if (origin && isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  return response;
}

// Check if origin is allowed for CORS
function isAllowedOrigin(origin: string): boolean {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://1001stories.org',
    'https://www.1001stories.org',
    'https://app.1001stories.org',
    process.env.NEXTAUTH_URL,
  ].filter(Boolean);
  
  return allowedOrigins.includes(origin);
}

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Authentication endpoints
  '/api/auth/signin': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many login attempts, please try again later',
  },
  '/api/auth/signup': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many signup attempts, please try again later',
  },
  '/api/auth/reset-password': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset attempts, please try again later',
  },
  
  // API endpoints
  '/api': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests, please slow down',
  },
  
  // Payment endpoints
  '/api/payments': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many payment requests, please try again',
  },
  
  // File upload
  '/api/upload': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    message: 'Too many uploads, please try again later',
  },
};

// CSRF token generation and validation
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken && token.length === 44; // Base64 encoded 32 bytes
}

// Input sanitization
export function sanitizeInput(input: string): string {
  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  // Remove any potential SQL injection attempts
  sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC|SCRIPT)\b)/gi, '');
  
  // Trim and limit length
  return sanitized.trim().substring(0, 10000);
}

// File upload validation
export interface FileValidationOptions {
  maxSize: number; // in bytes
  allowedTypes: string[];
  allowedExtensions: string[];
}

export const FILE_VALIDATION_PRESETS: Record<string, FileValidationOptions> = {
  image: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  document: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions: ['.pdf', '.doc', '.docx'],
  },
  video: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['video/mp4', 'video/mpeg', 'video/quicktime'],
    allowedExtensions: ['.mp4', '.mpeg', '.mov'],
  },
};

export function validateFile(
  file: File,
  options: FileValidationOptions
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > options.maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${options.maxSize / (1024 * 1024)}MB`,
    };
  }
  
  // Check file type
  if (!options.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }
  
  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!options.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension ${extension} is not allowed`,
    };
  }
  
  return { valid: true };
}

// Session security
export interface SessionConfig {
  maxAge: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
}

export const SESSION_CONFIG: SessionConfig = {
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

// Audit logging
export interface AuditLog {
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  ip: string;
  userAgent: string;
  success: boolean;
  metadata?: Record<string, string | number | boolean>;
}

export async function logAuditEvent(event: AuditLog): Promise<void> {
  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to CloudWatch, DataDog, etc.
    console.log('[AUDIT]', JSON.stringify(event));
  } else {
    console.log('[AUDIT]', event);
  }
}

// Export all security utilities
const securityUtils = {
  getSecurityHeaders,
  applySecurityHeaders,
  generateCSRFToken,
  validateCSRFToken,
  sanitizeInput,
  validateFile,
  logAuditEvent,
  RATE_LIMIT_CONFIGS,
  FILE_VALIDATION_PRESETS,
  SESSION_CONFIG,
};

export default securityUtils;