import { UserRole } from '@prisma/client';
import { executeWithRLSBypass } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

// Demo account email patterns
const DEMO_EMAIL_PATTERNS = [
  /^.*@demo\.1001stories\.org$/,
  /^demo.*@.*$/,
  /^learner@demo\.com$/,
  /^teacher@demo\.com$/,
  /^volunteer@demo\.com$/,
  /^institution@demo\.com$/,
];

// Mapping for legacy demo emails to new demo emails
const DEMO_EMAIL_MAPPING: Record<string, string> = {
  'learner@demo.com': 'learner@demo.1001stories.org',
  'teacher@demo.com': 'teacher@demo.1001stories.org',
  'volunteer@demo.com': 'volunteer@demo.1001stories.org',
  'institution@demo.com': 'institution@demo.1001stories.org',
};

/**
 * Check if email is a demo account
 */
export function isDemoEmail(email: string): boolean {
  if (!email) return false;
  
  // Check if demo mode is enabled
  if (process.env.DEMO_MODE_ENABLED !== 'true') {
    return false;
  }
  
  // Check if email matches any demo pattern
  return DEMO_EMAIL_PATTERNS.some(pattern => pattern.test(email));
}

/**
 * Get mapped demo email if using legacy format
 */
export function getMappedDemoEmail(email: string): string {
  return DEMO_EMAIL_MAPPING[email] || email;
}

/**
 * Create or get demo user
 */
export async function getOrCreateDemoUser(email: string) {
  // Try to use the default prisma client first
  try {
    const { prisma } = await import('@/lib/prisma');
    
    // Map legacy email to new format
    const mappedEmail = getMappedDemoEmail(email);
    
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: mappedEmail },
      include: {
        profile: true,
        subscription: true,
      },
    });

    if (user) {
      return user;
    }

    // Determine role from email
    let role: UserRole = UserRole.LEARNER;
    if (mappedEmail.includes('teacher')) {
      role = UserRole.TEACHER;
    } else if (mappedEmail.includes('volunteer')) {
      role = UserRole.VOLUNTEER;
    } else if (mappedEmail.includes('institution')) {
      role = UserRole.INSTITUTION;
    }

    // Create demo user
    user = await prisma.user.create({
      data: {
        email: mappedEmail,
        name: `Demo ${role.charAt(0) + role.slice(1).toLowerCase()}`,
        role,
        emailVerified: new Date(),
        profile: {
          create: {
            bio: `Demo account for ${role.toLowerCase()} role`,
            language: 'en',
          },
        },
        subscription: {
          create: {
            plan: 'FREE',
            status: 'ACTIVE',
            maxStudents: 30,
            maxDownloads: 10,
            canAccessPremium: false,
            canDownloadPDF: false,
            canCreateClasses: role === UserRole.TEACHER || role === UserRole.INSTITUTION,
          },
        },
      },
      include: {
        profile: true,
        subscription: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Demo user creation failed:', error);
    throw error;
  }
}

/**
 * Generate a secure demo session token
 */
export function generateDemoToken(userId: string, email: string, role: UserRole): string {
  const secret = process.env.NEXTAUTH_SECRET || 'demo-secret-key';
  
  const payload = {
    sub: userId,
    email,
    role,
    isDemoAccount: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
  };

  return jwt.sign(payload, secret);
}

/**
 * Verify demo token
 */
export function verifyDemoToken(token: string): unknown {
  const secret = process.env.NEXTAUTH_SECRET || 'demo-secret-key';
  
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    console.error('Demo token verification failed:', error);
    return null;
  }
}

/**
 * Check if email service is configured
 */
export function isEmailServiceConfigured(): boolean {
  return (
    process.env.EMAIL_SERVICE_ENABLED === 'true' &&
    !!(process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST) &&
    !!(process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT) &&
    !!(process.env.SMTP_USER || process.env.EMAIL_SERVER_USER) &&
    !!(process.env.SMTP_PASSWORD || process.env.EMAIL_SERVER_PASSWORD) &&
    (process.env.SMTP_USER || process.env.EMAIL_SERVER_USER) !== 'your-email@gmail.com'
  );
}

/**
 * Get demo mode status
 */
export function getDemoModeStatus() {
  return {
    enabled: process.env.DEMO_MODE_ENABLED === 'true',
    bypassEmail: process.env.DEMO_BYPASS_EMAIL === 'true',
    accountsEnabled: process.env.DEMO_ACCOUNTS_ENABLED === 'true',
    emailServiceConfigured: isEmailServiceConfigured(),
  };
}

/**
 * Generate a magic link URL for demo accounts
 */
export function generateDemoMagicLink(email: string, callbackUrl: string = '/dashboard'): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const token = randomBytes(32).toString('hex');
  
  // Store token temporarily (in production, use Redis or similar)
  // For demo purposes, we'll use the token directly
  
  return `${baseUrl}/api/auth/demo-verify?token=${token}&email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

/**
 * Demo account limitations
 */
export const DEMO_LIMITATIONS = {
  maxSessions: 1,
  sessionDuration: 60 * 60 * 1000, // 1 hour in milliseconds
  maxApiCalls: 100,
  allowedActions: [
    'read',
    'view',
    'browse',
    'search',
  ],
  restrictedActions: [
    'create',
    'update',
    'delete',
    'purchase',
    'download',
    'export',
  ],
};

/**
 * Check if action is allowed for demo account
 */
export function isDemoActionAllowed(action: string, isDemoAccount: boolean): boolean {
  if (!isDemoAccount) return true;
  
  return !DEMO_LIMITATIONS.restrictedActions.includes(action);
}