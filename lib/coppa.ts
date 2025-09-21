/**
 * COPPA (Children's Online Privacy Protection Act) Compliance Utilities
 * 
 * This module provides utilities for handling COPPA compliance requirements,
 * including age verification and parental consent management.
 */

import { AgeVerificationStatus, ParentalConsentStatus } from '@prisma/client';

export interface AgeVerificationResult {
  isMinor: boolean;
  age: number;
  requiresParentalConsent: boolean;
  ageVerificationStatus: AgeVerificationStatus;
  parentalConsentStatus: ParentalConsentStatus;
}

export interface COPPAComplianceCheck {
  isCompliant: boolean;
  canCreateAccount: boolean;
  requiresParentalConsent: boolean;
  reason?: string;
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Determine if user is a minor (under 13) according to COPPA
 */
export function isMinorUnderCOPPA(dateOfBirth: Date): boolean {
  return calculateAge(dateOfBirth) < 13;
}

/**
 * Verify age and determine COPPA requirements
 */
export function verifyAge(dateOfBirth: Date): AgeVerificationResult {
  const age = calculateAge(dateOfBirth);
  const isMinor = isMinorUnderCOPPA(dateOfBirth);
  
  return {
    isMinor,
    age,
    requiresParentalConsent: isMinor,
    ageVerificationStatus: isMinor ? AgeVerificationStatus.VERIFIED_MINOR : AgeVerificationStatus.VERIFIED_ADULT,
    parentalConsentStatus: isMinor ? ParentalConsentStatus.PENDING : ParentalConsentStatus.NOT_REQUIRED,
  };
}

/**
 * Check if date of birth is valid (not in future, not unreasonably old)
 */
export function isValidDateOfBirth(dateOfBirth: Date): boolean {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  
  // Check if date is in the future
  if (birthDate > today) {
    return false;
  }
  
  // Check if age is reasonable (not more than 120 years old)
  const age = calculateAge(birthDate);
  if (age > 120) {
    return false;
  }
  
  // Check if date is not too far in the past (min age 3 for using digital platform)
  if (age < 3) {
    return false;
  }
  
  return true;
}

/**
 * Check COPPA compliance for account creation
 */
export function checkCOPPACompliance(
  dateOfBirth: Date,
  parentalConsentStatus?: ParentalConsentStatus
): COPPAComplianceCheck {
  if (!isValidDateOfBirth(dateOfBirth)) {
    return {
      isCompliant: false,
      canCreateAccount: false,
      requiresParentalConsent: false,
      reason: 'Invalid date of birth'
    };
  }
  
  const ageResult = verifyAge(dateOfBirth);
  
  if (!ageResult.isMinor) {
    return {
      isCompliant: true,
      canCreateAccount: true,
      requiresParentalConsent: false
    };
  }
  
  // For minors, check parental consent status
  const consentStatus = parentalConsentStatus || ParentalConsentStatus.PENDING;
  
  switch (consentStatus) {
    case ParentalConsentStatus.GRANTED:
      return {
        isCompliant: true,
        canCreateAccount: true,
        requiresParentalConsent: true
      };
    
    case ParentalConsentStatus.DENIED:
      return {
        isCompliant: false,
        canCreateAccount: false,
        requiresParentalConsent: true,
        reason: 'Parental consent was denied'
      };
    
    case ParentalConsentStatus.EXPIRED:
      return {
        isCompliant: false,
        canCreateAccount: false,
        requiresParentalConsent: true,
        reason: 'Parental consent has expired'
      };
    
    case ParentalConsentStatus.PENDING:
    default:
      return {
        isCompliant: false,
        canCreateAccount: false,
        requiresParentalConsent: true,
        reason: 'Pending parental consent'
      };
  }
}

/**
 * Generate parental consent email template data
 */
export function generateParentalConsentData(
  childName: string,
  childEmail: string,
  childAge: number,
  parentEmail: string,
  consentToken: string
) {
  return {
    childName,
    childEmail,
    childAge,
    parentEmail,
    consentToken,
    consentUrl: `${process.env.NEXTAUTH_URL}/parental-consent?token=${consentToken}`,
    expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  };
}

/**
 * Validate parental consent token (basic implementation)
 */
export function validateConsentToken(token: string): boolean {
  // This is a basic implementation. In production, you'd want to:
  // 1. Store tokens in database with expiration
  // 2. Use cryptographic signing
  // 3. Include additional security measures
  
  if (!token || token.length < 10) {
    return false;
  }
  
  // For now, just check if it's a valid format
  return /^[a-zA-Z0-9]{20,}$/.test(token);
}

/**
 * Generate a secure consent token
 */
export function generateConsentToken(): string {
  // Generate a random token for parental consent
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return token;
}

/**
 * Check if parental consent is still valid (not expired)
 */
export function isParentalConsentValid(consentDate: Date): boolean {
  const now = new Date();
  const consentExpiry = new Date(consentDate);
  
  // Parental consent expires after 1 year
  consentExpiry.setFullYear(consentExpiry.getFullYear() + 1);
  
  return now < consentExpiry;
}

/**
 * Get data collection restrictions for minors
 */
export function getMinorDataRestrictions() {
  return {
    canCollectPersonalInfo: false,
    canCollectBehavioralData: false,
    canSendMarketingEmails: false,
    canShareDataWithThirdParties: false,
    canUseGeolocation: false,
    requiresParentalConsent: true,
    dataRetentionPeriod: '2 years', // or until account deletion
    allowedDataTypes: [
      'account_creation_data',
      'educational_progress',
      'reading_preferences'
    ]
  };
}

/**
 * Get age-appropriate content filters
 */
export function getAgeAppropriateContentFilters(age: number) {
  if (age < 6) {
    return {
      maxReadingLevel: 'kindergarten',
      allowedTopics: ['animals', 'family', 'friendship', 'nature'],
      blockedTopics: ['violence', 'scary', 'complex_social_issues'],
      requiresParentalApproval: true
    };
  } else if (age < 9) {
    return {
      maxReadingLevel: 'elementary',
      allowedTopics: ['adventure', 'animals', 'family', 'friendship', 'nature', 'school'],
      blockedTopics: ['violence', 'romance', 'complex_social_issues'],
      requiresParentalApproval: false
    };
  } else if (age < 13) {
    return {
      maxReadingLevel: 'middle_grade',
      allowedTopics: ['adventure', 'animals', 'family', 'friendship', 'nature', 'school', 'sports', 'science'],
      blockedTopics: ['violence', 'mature_themes'],
      requiresParentalApproval: false
    };
  } else {
    return {
      maxReadingLevel: 'all',
      allowedTopics: 'all',
      blockedTopics: [],
      requiresParentalApproval: false
    };
  }
}