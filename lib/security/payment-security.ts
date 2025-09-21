/**
 * Payment Security Configuration
 * PCI DSS compliant payment handling for 1001 Stories platform
 */

import crypto from 'crypto';
import { z } from 'zod';

// Payment provider types
export type PaymentProvider = 'stripe' | 'paypal';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type SubscriptionPlan = 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.PAYMENT_ENCRYPTION_KEY || '';
const ENCRYPTION_IV_LENGTH = 16;
// const ENCRYPTION_TAG_LENGTH = 16; // Reserved for future use
const ENCRYPTION_SALT_LENGTH = 64;

// Payment validation schemas
export const PaymentIntentSchema = z.object({
  amount: z.number().min(100).max(99999900), // In cents, $1 to $999,999
  currency: z.enum(['usd', 'eur', 'gbp', 'krw', 'jpy']),
  description: z.string().max(500),
  metadata: z.record(z.string(), z.string()).optional(),
  customerId: z.string().uuid(),
  paymentMethod: z.enum(['card', 'bank_transfer', 'paypal']),
});

export const SubscriptionSchema = z.object({
  planId: z.enum(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']),
  customerId: z.string().uuid(),
  interval: z.enum(['monthly', 'yearly']),
  trialDays: z.number().min(0).max(90).optional(),
  couponCode: z.string().optional(),
});

export const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  created: z.number(),
  data: z.object({
    object: z.record(z.string(), z.any()),
  }),
  signature: z.string(),
});

// Idempotency key generation
export function generateIdempotencyKey(
  userId: string,
  action: string,
  timestamp: number = Date.now()
): string {
  const data = `${userId}-${action}-${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Payment token encryption (for storing payment method references)
export function encryptPaymentToken(token: string): {
  encrypted: string;
  iv: string;
  tag: string;
  salt: string;
} {
  if (!ENCRYPTION_KEY) {
    throw new Error('Payment encryption key not configured');
  }
  
  const salt = crypto.randomBytes(ENCRYPTION_SALT_LENGTH);
  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    salt: salt.toString('hex'),
  };
}

// Payment token decryption
export function decryptPaymentToken(encryptedData: {
  encrypted: string;
  iv: string;
  tag: string;
  salt: string;
}): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('Payment encryption key not configured');
  }
  
  const salt = Buffer.from(encryptedData.salt, 'hex');
  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const tag = Buffer.from(encryptedData.tag, 'hex');
  
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Webhook signature verification
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  provider: PaymentProvider
): boolean {
  if (provider === 'stripe') {
    return verifyStripeSignature(payload, signature, secret);
  } else if (provider === 'paypal') {
    return verifyPayPalSignature(payload, signature, secret);
  }
  return false;
}

function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const elements = signature.split(',');
  let timestamp = '';
  const signatures: string[] = [];
  
  for (const element of elements) {
    const [key, value] = element.split('=');
    if (key === 't') {
      timestamp = value;
    } else if (key === 'v1') {
      signatures.push(value);
    }
  }
  
  if (!timestamp || signatures.length === 0) {
    return false;
  }
  
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  // Timing-safe comparison
  for (const sig of signatures) {
    if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSignature))) {
      // Check timestamp to prevent replay attacks (5 minute tolerance)
      const tolerance = 300; // 5 minutes
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime - parseInt(timestamp) > tolerance) {
        return false;
      }
      return true;
    }
  }
  
  return false;
}

function verifyPayPalSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // PayPal webhook verification
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Transaction logging for audit trail
export interface TransactionLog {
  id: string;
  timestamp: Date;
  userId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  paymentIntentId?: string;
  subscriptionId?: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
}

export async function logTransaction(transaction: TransactionLog): Promise<void> {
  // Store in database with encryption
  const sensitiveData = {
    paymentIntentId: transaction.paymentIntentId,
    metadata: transaction.metadata,
  };
  
  const encryptedData = encryptPaymentToken(JSON.stringify(sensitiveData));
  
  // In production, store in database
  console.log('[TRANSACTION]', {
    ...transaction,
    paymentIntentId: '[ENCRYPTED]',
    metadata: '[ENCRYPTED]',
    encryptedData,
  });
}

// Fraud detection rules
export interface FraudCheckResult {
  passed: boolean;
  riskScore: number; // 0-100
  reasons: string[];
}

export async function performFraudCheck(
  userId: string,
  amount: number,
  ipAddress: string,
  metadata: Record<string, unknown>
): Promise<FraudCheckResult> {
  const reasons: string[] = [];
  let riskScore = 0;
  
  // Check for high-risk amount
  if (amount > 100000) { // $1000
    riskScore += 20;
    reasons.push('High transaction amount');
  }
  
  // Check for rapid transactions
  // In production, check database for recent transactions
  const recentTransactionCount = 0; // Placeholder
  if (recentTransactionCount > 5) {
    riskScore += 30;
    reasons.push('Multiple transactions in short period');
  }
  
  // Check for known VPN/proxy IPs
  if (await isVpnOrProxy(ipAddress)) {
    riskScore += 25;
    reasons.push('VPN or proxy detected');
  }
  
  // Check for mismatched billing/shipping
  if (metadata.billingCountry !== metadata.shippingCountry) {
    riskScore += 15;
    reasons.push('Billing and shipping country mismatch');
  }
  
  // Check for new user with high value transaction
  if (metadata.isNewUser && amount > 50000) { // $500
    riskScore += 20;
    reasons.push('New user with high value transaction');
  }
  
  return {
    passed: riskScore < 70,
    riskScore,
    reasons,
  };
}

async function isVpnOrProxy(_ipAddress: string): Promise<boolean> {
  // In production, use IP intelligence service to check _ipAddress
  // For now, return false
  return false;
}

// Payment retry strategy
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

export async function retryPayment<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined;
  let delay = config.initialDelay;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === config.maxAttempts) {
        break;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Calculate next delay with exponential backoff
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }
  
  throw lastError || new Error('Payment retry failed');
}

// PCI DSS compliance helpers
export const PCI_COMPLIANCE = {
  // Never store these fields
  prohibitedFields: [
    'cardNumber',
    'cvv',
    'cvc',
    'securityCode',
    'pin',
  ],
  
  // Fields that must be encrypted if stored
  encryptedFields: [
    'paymentMethodId',
    'customerId',
    'subscriptionId',
  ],
  
  // Audit log retention (days)
  auditLogRetention: 365,
  
  // Session timeout (minutes)
  sessionTimeout: 15,
  
  // Password requirements
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventReuse: 12, // Last 12 passwords
  },
};

// Subscription management
export interface SubscriptionConfig {
  plans: Record<SubscriptionPlan, {
    name: string;
    price: {
      monthly: number;
      yearly: number;
    };
    features: string[];
    limits: Record<string, number>;
  }>;
  gracePeriodDays: number;
  trialDays: number;
}

export const SUBSCRIPTION_CONFIG: SubscriptionConfig = {
  plans: {
    FREE: {
      name: 'Free',
      price: { monthly: 0, yearly: 0 },
      features: ['5 stories per month', 'Basic analytics'],
      limits: { stories: 5, users: 1 },
    },
    BASIC: {
      name: 'Basic',
      price: { monthly: 999, yearly: 9990 }, // $9.99/mo or $99.90/yr
      features: ['50 stories per month', 'Advanced analytics', 'Email support'],
      limits: { stories: 50, users: 5 },
    },
    PREMIUM: {
      name: 'Premium',
      price: { monthly: 2999, yearly: 29990 }, // $29.99/mo or $299.90/yr
      features: ['Unlimited stories', 'Premium analytics', 'Priority support', 'API access'],
      limits: { stories: -1, users: 20 },
    },
    ENTERPRISE: {
      name: 'Enterprise',
      price: { monthly: 9999, yearly: 99990 }, // $99.99/mo or $999.90/yr
      features: ['Everything in Premium', 'Custom integrations', 'Dedicated support', 'SLA'],
      limits: { stories: -1, users: -1 },
    },
  },
  gracePeriodDays: 7,
  trialDays: 14,
};

// Export all payment security utilities
const paymentSecurity = {
  generateIdempotencyKey,
  encryptPaymentToken,
  decryptPaymentToken,
  verifyWebhookSignature,
  logTransaction,
  performFraudCheck,
  retryPayment,
  PaymentIntentSchema,
  SubscriptionSchema,
  WebhookEventSchema,
  PCI_COMPLIANCE,
  SUBSCRIPTION_CONFIG,
};

export default paymentSecurity;