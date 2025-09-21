import { prisma } from '@/lib/prisma'
import { PrismaClient, DeletionStatus, UserRole, DeletionAction, ActorType } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomBytes, createHash } from 'crypto'
import { calculateAge, isMinorUnderCOPPA } from '@/lib/coppa'
import { headers } from 'next/headers'

/**
 * GDPR Article 17 (Right to Erasure) Implementation
 * 
 * This module provides comprehensive data deletion functionality
 * with full COPPA compliance and audit logging.
 */

export interface DeletionRequestParams {
  userId: string
  reason?: string
  requestSource?: 'self_service' | 'parental' | 'admin'
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  performedBy?: string
  performedByRole?: UserRole
}

export interface AuditLogContext {
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  fingerprint?: string
  location?: string
  device?: string
}

export interface DeletionValidationResult {
  canDelete: boolean
  requiresParentalConsent: boolean
  requiresReview: boolean
  blockers: string[]
  warnings: string[]
}

/**
 * Validates if a user can initiate account deletion
 */
export async function validateDeletionRequest(userId: string): Promise<DeletionValidationResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      deletionRequest: true,
      orders: { where: { status: { in: ['PENDING', 'PROCESSING'] } } },
      recurringDonations: { where: { status: 'ACTIVE' } },
      volunteerProfile: {
        include: {
          applications: { where: { status: 'PENDING' } }
        }
      }
    }
  })

  if (!user) {
    return {
      canDelete: false,
      requiresParentalConsent: false,
      requiresReview: false,
      blockers: ['User not found'],
      warnings: []
    }
  }

  const blockers: string[] = []
  const warnings: string[] = []
  let requiresParentalConsent = false
  let requiresReview = false

  // Check for existing deletion request
  if (user.deletionRequest && user.deletionRequest.status !== 'CANCELLED') {
    blockers.push('Active deletion request already exists')
  }

  // Check for active financial transactions
  if (user.orders && user.orders.length > 0) {
    blockers.push('Active orders must be completed or cancelled first')
  }

  if (user.recurringDonations && user.recurringDonations.length > 0) {
    warnings.push('Active recurring donations will be cancelled')
  }

  // Check for active volunteer commitments
  if (user.volunteerProfile) {
    const activeApplications = user.volunteerProfile.applications?.length || 0
    
    if (activeApplications > 0) {
      warnings.push('Active volunteer applications will be transferred or cancelled')
      requiresReview = true
    }
  }

  // COPPA compliance check
  if (user.profile?.dateOfBirth) {
    const age = calculateAge(user.profile.dateOfBirth)
    if (isMinorUnderCOPPA(user.profile.dateOfBirth)) {
      requiresParentalConsent = true
      warnings.push('Parental consent required for users under 13')
    }
  }

  // Check if user is an institution coordinator or teacher with active classes
  if (user.role === 'INSTITUTION' || user.role === 'TEACHER') {
    const activeClasses = await prisma.class.count({
      where: {
        teacherId: userId,
        isActive: true
      }
    })
    
    if (activeClasses > 0) {
      warnings.push('Active classes will need to be transferred to another educator')
      requiresReview = true
    }
  }

  return {
    canDelete: blockers.length === 0,
    requiresParentalConsent,
    requiresReview,
    blockers,
    warnings
  }
}

/**
 * Initiates a user deletion request with full audit logging
 */
export async function initiateDeletionRequest(params: DeletionRequestParams) {
  const { userId, reason, requestSource = 'self_service', ipAddress, userAgent, performedBy, performedByRole } = params

  // Validate the deletion request
  const validation = await validateDeletionRequest(userId)
  if (!validation.canDelete) {
    throw new Error(`Cannot delete account: ${validation.blockers.join(', ')}`)
  }

  // Generate tokens for confirmation process
  const parentConfirmationToken = validation.requiresParentalConsent 
    ? randomBytes(32).toString('hex') 
    : null
  const finalConfirmationToken = randomBytes(32).toString('hex')

  // Determine initial status
  let initialStatus: DeletionStatus = 'PENDING'
  if (validation.requiresParentalConsent) {
    initialStatus = 'PARENTAL_CONSENT_REQUIRED'
  } else if (validation.requiresReview) {
    initialStatus = 'REVIEW_REQUIRED'
  }

  // Create deletion request
  const deletionRequest = await prisma.userDeletionRequest.create({
    data: {
      userId,
      status: initialStatus,
      deletionReason: reason,
      parentalConsentRequired: validation.requiresParentalConsent,
      parentConfirmationToken,
      parentConfirmationExpiry: validation.requiresParentalConsent 
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        : null,
      finalConfirmationToken,
      finalConfirmationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      requestSource,
      ipAddress,
      userAgent,
      reviewRequired: validation.requiresReview,
      additionalContext: {
        warnings: validation.warnings,
        requiresParentalConsent: validation.requiresParentalConsent,
        requiresReview: validation.requiresReview
      }
    }
  })

  // Create audit log entry with enhanced context
  await createDeletionAuditLog({
    deletionRequestId: deletionRequest.id,
    action: 'REQUEST_CREATED',
    performedBy,
    performedByRole,
    performedByType: requestSource === 'admin' ? 'ADMIN' : 'USER',
    newStatus: initialStatus,
    details: `Deletion request initiated with status: ${initialStatus}`,
    metadata: {
      reason,
      warnings: validation.warnings,
      requestSource,
      validationResults: validation
    },
    context: {
      ipAddress,
      userAgent,
      sessionId: params.sessionId,
      fingerprint: params.sessionId ? createFingerprint(params) : undefined
    }
  })

  return {
    deletionRequest,
    validation,
    nextSteps: getNextSteps(deletionRequest, validation)
  }
}

/**
 * Processes parental consent for COPPA-protected minors
 */
export async function processParentalConsent(
  token: string, 
  parentConsent: boolean,
  parentInfo?: { name: string; email: string }
): Promise<void> {
  const deletionRequest = await prisma.userDeletionRequest.findUnique({
    where: { parentConfirmationToken: token },
    include: { user: true }
  })

  if (!deletionRequest) {
    throw new Error('Invalid or expired parental consent token')
  }

  if (deletionRequest.parentConfirmationExpiry && deletionRequest.parentConfirmationExpiry < new Date()) {
    throw new Error('Parental consent token has expired')
  }

  if (parentConsent) {
    // Parent approved deletion
    await prisma.userDeletionRequest.update({
      where: { id: deletionRequest.id },
      data: {
        parentalConsentVerified: true,
        status: deletionRequest.reviewRequired ? 'REVIEW_REQUIRED' : 'CONFIRMED',
        additionalContext: {
          ...deletionRequest.additionalContext as any,
          parentInfo
        }
      }
    })

    await createDeletionAuditLog({
      deletionRequestId: deletionRequest.id,
      action: 'PARENTAL_CONSENT_GRANTED',
      performedByType: 'PARENT',
      previousStatus: deletionRequest.status,
      newStatus: deletionRequest.reviewRequired ? 'REVIEW_REQUIRED' : 'CONFIRMED',
      details: 'Parental consent granted for minor account deletion',
      metadata: { 
        parentInfo,
        consentToken: token.substring(0, 8) + '...' // Log partial token for audit
      }
    })
  } else {
    // Parent denied deletion
    await prisma.userDeletionRequest.update({
      where: { id: deletionRequest.id },
      data: {
        status: 'CANCELLED',
        additionalContext: {
          ...deletionRequest.additionalContext as any,
          parentInfo,
          cancellationReason: 'Parental consent denied'
        }
      }
    })

    await createDeletionAuditLog({
      deletionRequestId: deletionRequest.id,
      action: 'PARENTAL_CONSENT_DENIED',
      performedByType: 'PARENT',
      previousStatus: deletionRequest.status,
      newStatus: 'CANCELLED',
      details: 'Parental consent denied for minor account deletion',
      metadata: { 
        parentInfo,
        consentToken: token.substring(0, 8) + '...',
        cancellationReason: 'Parental consent denied'
      }
    })
  }
}

/**
 * Performs soft delete - account becomes inaccessible but data retained for recovery period
 */
export async function performSoftDelete(deletionRequestId: string, performedBy?: string): Promise<void> {
  const deletionRequest = await prisma.userDeletionRequest.findUnique({
    where: { id: deletionRequestId },
    include: { user: true }
  })

  if (!deletionRequest) {
    throw new Error('Deletion request not found')
  }

  if (deletionRequest.status !== 'CONFIRMED') {
    throw new Error(`Cannot perform soft delete. Current status: ${deletionRequest.status}`)
  }

  const recoveryDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await prisma.$transaction(async (tx) => {
    // Update user record
    await tx.user.update({
      where: { id: deletionRequest.userId },
      data: {
        deletedAt: new Date(),
        deletionRequestId: deletionRequestId
      }
    })

    // Update deletion request
    await tx.userDeletionRequest.update({
      where: { id: deletionRequestId },
      data: {
        status: 'SOFT_DELETED',
        softDeletedAt: new Date(),
        recoveryDeadline
      }
    })
  })

  await createDeletionAuditLog({
    deletionRequestId,
    action: 'SOFT_DELETE_EXECUTED',
    performedBy,
    performedByType: 'SYSTEM',
    previousStatus: 'CONFIRMED',
    newStatus: 'SOFT_DELETED',
    details: `Account soft deleted. Recovery deadline: ${recoveryDeadline.toISOString()}`,
    metadata: {
      recoveryDeadline: recoveryDeadline.toISOString(),
      softDeletedAt: new Date().toISOString()
    }
  })
}

/**
 * Recovers an account during the soft delete period
 */
export async function recoverAccount(userId: string, performedBy?: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { deletionRequest: true }
  })

  if (!user?.deletionRequest) {
    throw new Error('No active deletion request found')
  }

  if (user.deletionRequest.status !== 'SOFT_DELETED') {
    throw new Error(`Cannot recover account. Current status: ${user.deletionRequest.status}`)
  }

  if (!user.deletionRequest.recoveryDeadline || user.deletionRequest.recoveryDeadline < new Date()) {
    throw new Error('Recovery period has expired')
  }

  await prisma.$transaction(async (tx) => {
    // Restore user account
    await tx.user.update({
      where: { id: userId },
      data: {
        deletedAt: null,
        deletionRequestId: null
      }
    })

    // Update deletion request status
    await tx.userDeletionRequest.update({
      where: { id: user.deletionRequest!.id },
      data: {
        status: 'RECOVERED'
      }
    })
  })

  await createDeletionAuditLog({
    deletionRequestId: user.deletionRequest.id,
    action: 'ACCOUNT_RECOVERED',
    performedBy,
    performedByType: 'USER',
    previousStatus: 'SOFT_DELETED',
    newStatus: 'RECOVERED',
    details: 'Account recovered during soft delete period',
    metadata: {
      recoveredAt: new Date().toISOString(),
      daysUntilHardDelete: Math.ceil((user.deletionRequest.recoveryDeadline!.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    }
  })
}

/**
 * Performs hard delete - permanently removes personal data with selective anonymization
 */
export async function performHardDelete(deletionRequestId: string, performedBy?: string): Promise<void> {
  const deletionRequest = await prisma.userDeletionRequest.findUnique({
    where: { id: deletionRequestId },
    include: { user: true }
  })

  if (!deletionRequest) {
    throw new Error('Deletion request not found')
  }

  if (deletionRequest.status !== 'SOFT_DELETED') {
    throw new Error(`Cannot perform hard delete. Current status: ${deletionRequest.status}`)
  }

  const userId = deletionRequest.userId

  await prisma.$transaction(async (tx) => {
    // Delete or anonymize data based on retention requirements
    await anonymizeUserData(tx, userId, deletionRequestId)
    
    // Update deletion request
    await tx.userDeletionRequest.update({
      where: { id: deletionRequestId },
      data: {
        status: 'HARD_DELETED',
        hardDeletedAt: new Date()
      }
    })
  })

  await createDeletionAuditLog({
    deletionRequestId,
    action: 'HARD_DELETE_EXECUTED',
    performedBy,
    performedByType: 'SYSTEM',
    previousStatus: 'SOFT_DELETED',
    newStatus: 'HARD_DELETED',
    details: 'Account permanently deleted with data anonymization',
    metadata: {
      hardDeletedAt: new Date().toISOString(),
      dataAnonymized: true
    }
  })
}

/**
 * Anonymizes or deletes user data based on legal retention requirements
 */
async function anonymizeUserData(tx: any, userId: string, deletionRequestId: string): Promise<void> {
  // Delete personal data that can be removed immediately
  await tx.profile.deleteMany({ where: { userId } })
  await tx.session.deleteMany({ where: { userId } })
  await tx.account.deleteMany({ where: { userId } })

  // Anonymize retained data (financial records, public contributions)
  const anonymizedId = `anon_${randomBytes(8).toString('hex')}`
  
  // Anonymize orders (retain for financial/legal requirements)
  await tx.order.updateMany({
    where: { userId },
    data: { 
      customerEmail: `${anonymizedId}@anonymized.local`,
      customerName: 'Anonymized User'
    }
  })

  // Anonymize published stories (retain content, remove attribution)
  await tx.story.updateMany({
    where: { authorId: userId },
    data: { 
      authorId: null,
      authorName: 'Anonymous'
    }
  })

  // Anonymize volunteer contributions
  await tx.volunteerProfile.updateMany({
    where: { userId },
    data: {
      bio: 'Anonymized',
      skills: [],
      languages: []
    }
  })

  // Log anonymization actions with verification
  const timestamp = new Date()
  const anonymizationRecords = [
    {
      tableName: 'orders',
      recordId: userId,
      anonymizedFields: { customerEmail: `${anonymizedId}@anonymized.local`, customerName: 'Anonymized User' },
      retainedFields: { orderId: true, amount: true, date: true },
      anonymizationMethod: 'pseudonymization',
      retentionReason: 'Financial and tax compliance requirements',
      retentionPeriod: '7_years',
      legalBasis: 'legal_obligation',
      processedBy: 'system_anonymizer',
      verificationHash: createHash('sha256').update(`orders_${userId}_${timestamp.toISOString()}`).digest('hex'),
      createdAt: timestamp
    },
    {
      tableName: 'stories',
      recordId: userId,
      anonymizedFields: { authorId: null, authorName: 'Anonymous' },
      retainedFields: { title: true, content: true, publishedDate: true },
      anonymizationMethod: 'removal',
      retentionReason: 'Published content preservation for educational purposes',
      retentionPeriod: 'indefinite',
      legalBasis: 'legitimate_interest',
      processedBy: 'system_anonymizer',
      verificationHash: createHash('sha256').update(`stories_${userId}_${timestamp.toISOString()}`).digest('hex'),
      createdAt: timestamp
    },
    {
      tableName: 'volunteer_profiles',
      recordId: userId,
      anonymizedFields: { bio: 'Anonymized', skills: [], languages: [] },
      retainedFields: { totalHours: true, completedProjects: true },
      anonymizationMethod: 'generalization',
      retentionReason: 'Volunteer impact metrics and program evaluation',
      retentionPeriod: '5_years',
      legalBasis: 'legitimate_interest',
      processedBy: 'system_anonymizer',
      verificationHash: createHash('sha256').update(`volunteer_profiles_${userId}_${timestamp.toISOString()}`).digest('hex'),
      createdAt: timestamp
    }
  ]

  await tx.anonymizationLog.createMany({ data: anonymizationRecords })

  // Log data anonymization action in deletion audit log
  await createDeletionAuditLog({
    deletionRequestId,
    action: 'DATA_ANONYMIZED',
    performedByType: 'SYSTEM',
    recordCount: anonymizationRecords.length,
    details: `Data anonymized across ${anonymizationRecords.length} tables`,
    metadata: {
      anonymizedTables: anonymizationRecords.map(r => r.tableName),
      anonymizationMethod: 'mixed_pseudonymization_removal',
      retentionBases: anonymizationRecords.map(r => ({ table: r.tableName, basis: r.legalBasis, period: r.retentionPeriod })),
      processedAt: timestamp.toISOString()
    }
  })

  // Finally, delete the user record
  await tx.user.delete({ where: { id: userId } })
}

/**
 * Creates a comprehensive audit log entry for deletion actions with enhanced security
 */
export async function createDeletionAuditLog(params: {
  deletionRequestId: string
  action: DeletionAction
  performedBy?: string
  performedByRole?: UserRole
  performedByType?: ActorType
  tableName?: string
  recordId?: string
  recordCount?: number
  previousStatus?: DeletionStatus
  newStatus?: DeletionStatus
  details?: string
  metadata?: any
  context?: AuditLogContext
}): Promise<any> {
  const timestamp = new Date()
  const logData = {
    deletionRequestId: params.deletionRequestId,
    action: params.action,
    performedBy: params.performedBy,
    performedByRole: params.performedByRole,
    performedByType: params.performedByType || 'SYSTEM',
    tableName: params.tableName,
    recordId: params.recordId,
    recordCount: params.recordCount,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    actionDetails: params.details,
    metadata: params.metadata,
    ipAddress: params.context?.ipAddress,
    userAgent: params.context?.userAgent,
    sessionId: params.context?.sessionId,
    createdAt: timestamp
  }

  // Create integrity hash for the log entry
  const logHash = createLogIntegrityHash(logData)
  
  const auditLog = await prisma.deletionAuditLog.create({
    data: {
      ...logData,
      metadata: {
        ...params.metadata,
        integrityHash: logHash,
        context: params.context
      }
    }
  })

  // Log critical actions to system log for monitoring
  if (['HARD_DELETE_EXECUTED', 'DATA_ANONYMIZED', 'SYSTEM_ERROR'].includes(params.action)) {
    console.log(`CRITICAL_AUDIT: ${params.action}`, {
      deletionRequestId: params.deletionRequestId,
      timestamp: timestamp.toISOString(),
      performer: params.performedBy || 'SYSTEM',
      hash: logHash
    })
  }
  
  return auditLog
}

/**
 * Gets next steps for a deletion request based on current status
 */
function getNextSteps(deletionRequest: any, validation: DeletionValidationResult): string[] {
  const steps: string[] = []

  if (validation.requiresParentalConsent) {
    steps.push('Parental consent email will be sent')
    steps.push('Parent must approve deletion within 7 days')
  }

  if (validation.requiresReview) {
    steps.push('Manual review required for account with active commitments')
  }

  if (!validation.requiresParentalConsent && !validation.requiresReview) {
    steps.push('Final confirmation email will be sent')
    steps.push('Click confirmation link within 24 hours')
    steps.push('Account will be soft deleted (7 day recovery period)')
    steps.push('After 7 days, account will be permanently deleted')
  }

  return steps
}

/**
 * Checks if an account can be recovered
 */
export async function canRecoverAccount(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { deletionRequest: true }
  })

  if (!user?.deletionRequest) return false
  if (user.deletionRequest.status !== 'SOFT_DELETED') return false
  if (!user.deletionRequest.recoveryDeadline) return false
  
  return user.deletionRequest.recoveryDeadline > new Date()
}

/**
 * Creates a cryptographic fingerprint for request tracking
 */
function createFingerprint(params: DeletionRequestParams): string {
  const data = `${params.userId}_${params.ipAddress}_${params.userAgent}_${params.sessionId}_${Date.now()}`
  return createHash('sha256').update(data).digest('hex')
}

/**
 * Creates an integrity hash for audit log entries
 */
function createLogIntegrityHash(logData: any): string {
  // Remove dynamic fields that shouldn't be part of integrity check
  const { metadata, ...coreData } = logData
  const dataString = JSON.stringify(coreData, Object.keys(coreData).sort())
  return createHash('sha256').update(dataString).digest('hex')
}

/**
 * Verifies the integrity of audit log entries
 */
async function verifyAuditLogIntegrity(auditLogs: any[]): Promise<{ verified: boolean; tamperedEntries: string[] }> {
  const tamperedEntries: string[] = []
  
  for (const log of auditLogs) {
    if (log.metadata?.integrityHash) {
      const { metadata, ...logData } = log
      const { integrityHash, ...otherMetadata } = metadata
      const recalculatedHash = createLogIntegrityHash({ ...logData, metadata: otherMetadata })
      
      if (recalculatedHash !== integrityHash) {
        tamperedEntries.push(log.id)
      }
    }
  }
  
  return {
    verified: tamperedEntries.length === 0,
    tamperedEntries
  }
}

/**
 * Gets comprehensive audit statistics for compliance reporting
 */
export async function getDeletionAuditStatistics(startDate?: Date, endDate?: Date) {
  const whereClause = startDate && endDate ? {
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  } : {}

  const [totalRequests, actionCounts, statusCounts] = await Promise.all([
    prisma.userDeletionRequest.count({ where: whereClause }),
    prisma.deletionAuditLog.groupBy({
      by: ['action'],
      _count: { action: true },
      where: whereClause
    }),
    prisma.userDeletionRequest.groupBy({
      by: ['status'],
      _count: { status: true },
      where: whereClause
    })
  ])

  return {
    totalRequests,
    actionBreakdown: Object.fromEntries(
      actionCounts.map(item => [item.action, item._count.action])
    ),
    statusBreakdown: Object.fromEntries(
      statusCounts.map(item => [item.status, item._count.status])
    ),
    generatedAt: new Date().toISOString()
  }
}

/**
 * Gets deletion request status for a user with enhanced audit trail
 */
export async function getDeletionStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { 
      deletionRequest: {
        include: {
          auditLogs: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
              id: true,
              action: true,
              performedByType: true,
              actionDetails: true,
              createdAt: true,
              previousStatus: true,
              newStatus: true,
              metadata: true
            }
          }
        }
      }
    }
  })

  if (!user?.deletionRequest) {
    return { 
      status: 'none', 
      canRequest: true,
      auditTrail: []
    }
  }

  const request = user.deletionRequest
  const canRecover = await canRecoverAccount(userId)
  
  // Verify audit log integrity
  const auditTrailIntegrity = await verifyAuditLogIntegrity(request.auditLogs)

  return {
    status: request.status.toLowerCase(),
    canRequest: false,
    canRecover,
    createdAt: request.createdAt,
    softDeletedAt: request.softDeletedAt,
    hardDeletedAt: request.hardDeletedAt,
    recoveryDeadline: request.recoveryDeadline,
    parentalConsentRequired: request.parentalConsentRequired,
    reviewRequired: request.reviewRequired,
    auditTrail: request.auditLogs.map(log => ({
      id: log.id,
      action: log.action,
      performer: log.performedByType,
      details: log.actionDetails,
      timestamp: log.createdAt,
      statusChange: log.previousStatus && log.newStatus ? {
        from: log.previousStatus,
        to: log.newStatus
      } : null
    })),
    integrity: auditTrailIntegrity
  }
}