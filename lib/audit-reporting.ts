import { prisma } from '@/lib/prisma'
import { getDeletionAuditStatistics } from '@/lib/gdpr-deletion'

/**
 * Automated GDPR Deletion Audit Reporting System
 * 
 * Generates comprehensive compliance reports for regulatory
 * auditing and internal security reviews.
 */

export interface AuditReport {
  id: string
  reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'
  period: {
    start: Date
    end: Date
  }
  generatedAt: Date
  generatedBy: 'SYSTEM' | 'ADMIN'
  summary: AuditReportSummary
  details: AuditReportDetails
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'REVIEW_REQUIRED'
  recommendations: string[]
  attachments: string[]
}

export interface AuditReportSummary {
  totalDeletionRequests: number
  completedDeletions: number
  pendingDeletions: number
  failedDeletions: number
  parentalConsentCases: number
  averageProcessingTime: number
  complianceRate: number
  securityIncidents: number
  dataBreaches: number
}

export interface AuditReportDetails {
  deletionsByStatus: Record<string, number>
  deletionsByAction: Record<string, number>
  processingTimeDistribution: {
    under24h: number
    under7days: number
    under30days: number
    over30days: number
  }
  geographicDistribution: Record<string, number>
  userRoleDistribution: Record<string, number>
  coppaCompliance: {
    totalMinorRequests: number
    parentalConsentGranted: number
    parentalConsentDenied: number
    avgConsentTime: number
  }
  gdprCompliance: {
    within30DayLimit: number
    exceeding30Days: number
    justifiedDelays: number
  }
  securityMetrics: {
    suspiciousActivities: number
    integrityViolations: number
    unauthorizedAccess: number
    systemErrors: number
  }
}

/**
 * Generates a comprehensive audit report for a specified time period
 */
export async function generateAuditReport(
  reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL',
  startDate?: Date,
  endDate?: Date,
  generatedBy: 'SYSTEM' | 'ADMIN' = 'SYSTEM'
): Promise<AuditReport> {
  
  const period = determinePeriod(reportType, startDate, endDate)
  const reportId = `${reportType.toLowerCase()}_${period.start.toISOString().split('T')[0]}_${Date.now()}`

  // Gather comprehensive data
  const [
    basicStats,
    detailedMetrics,
    complianceMetrics,
    securityMetrics
  ] = await Promise.all([
    getDeletionAuditStatistics(period.start, period.end),
    getDetailedMetrics(period.start, period.end),
    getComplianceMetrics(period.start, period.end),
    getSecurityMetrics(period.start, period.end)
  ])

  // Calculate summary metrics
  const summary: AuditReportSummary = {
    totalDeletionRequests: basicStats.totalRequests,
    completedDeletions: basicStats.statusBreakdown.HARD_DELETED || 0,
    pendingDeletions: (basicStats.statusBreakdown.PENDING || 0) + 
                     (basicStats.statusBreakdown.PARENTAL_CONSENT_REQUIRED || 0) +
                     (basicStats.statusBreakdown.REVIEW_REQUIRED || 0),
    failedDeletions: basicStats.statusBreakdown.FAILED || 0,
    parentalConsentCases: await getParentalConsentCount(period.start, period.end),
    averageProcessingTime: await getAverageProcessingTime(period.start, period.end),
    complianceRate: calculateComplianceRate(basicStats),
    securityIncidents: securityMetrics.totalIncidents,
    dataBreaches: 0 // Would be populated from security incident logs
  }

  // Compile detailed metrics
  const details: AuditReportDetails = {
    deletionsByStatus: basicStats.statusBreakdown,
    deletionsByAction: basicStats.actionBreakdown,
    processingTimeDistribution: detailedMetrics.processingTimeDistribution,
    geographicDistribution: detailedMetrics.geographicDistribution,
    userRoleDistribution: detailedMetrics.userRoleDistribution,
    coppaCompliance: complianceMetrics.coppaCompliance,
    gdprCompliance: complianceMetrics.gdprCompliance,
    securityMetrics: securityMetrics.details
  }

  // Assess overall compliance status
  const complianceStatus = assessComplianceStatus(summary, details)
  
  // Generate recommendations
  const recommendations = generateRecommendations(summary, details, complianceStatus)

  const report: AuditReport = {
    id: reportId,
    reportType,
    period,
    generatedAt: new Date(),
    generatedBy,
    summary,
    details,
    complianceStatus,
    recommendations,
    attachments: [] // Could include CSV exports, charts, etc.
  }

  // Log report generation
  console.log(`AUDIT_REPORT_GENERATED: ${reportType}`, {
    reportId,
    period: `${period.start.toISOString()} - ${period.end.toISOString()}`,
    complianceStatus,
    totalRequests: summary.totalDeletionRequests,
    generatedBy,
    timestamp: new Date().toISOString()
  })

  return report
}

/**
 * Determines the time period for the report based on type
 */
function determinePeriod(
  reportType: string, 
  startDate?: Date, 
  endDate?: Date
): { start: Date; end: Date } {
  const now = new Date()
  
  if (startDate && endDate) {
    return { start: startDate, end: endDate }
  }

  let start: Date
  let end: Date = now

  switch (reportType) {
    case 'DAILY':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      break
    case 'WEEKLY':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'MONTHLY':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end = new Date(now.getFullYear(), now.getMonth(), 0)
      break
    case 'QUARTERLY':
      const quarter = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), quarter * 3 - 3, 1)
      end = new Date(now.getFullYear(), quarter * 3, 0)
      break
    case 'ANNUAL':
      start = new Date(now.getFullYear() - 1, 0, 1)
      end = new Date(now.getFullYear() - 1, 11, 31)
      break
    default:
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }

  return { start, end }
}

/**
 * Gets detailed metrics for the report
 */
async function getDetailedMetrics(startDate: Date, endDate: Date) {
  const whereClause = {
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  }

  // Processing time distribution
  const completedDeletions = await prisma.userDeletionRequest.findMany({
    where: {
      ...whereClause,
      status: 'HARD_DELETED',
      hardDeletedAt: { not: null }
    },
    select: {
      createdAt: true,
      hardDeletedAt: true
    }
  })

  const processingTimeDistribution = {
    under24h: 0,
    under7days: 0,
    under30days: 0,
    over30days: 0
  }

  completedDeletions.forEach(deletion => {
    const processingTimeHours = (deletion.hardDeletedAt!.getTime() - deletion.createdAt.getTime()) / (1000 * 60 * 60)
    
    if (processingTimeHours < 24) {
      processingTimeDistribution.under24h++
    } else if (processingTimeHours < 7 * 24) {
      processingTimeDistribution.under7days++
    } else if (processingTimeHours < 30 * 24) {
      processingTimeDistribution.under30days++
    } else {
      processingTimeDistribution.over30days++
    }
  })

  // User role distribution
  const userRoleDistribution = await prisma.userDeletionRequest.groupBy({
    by: ['userId'],
    where: whereClause,
    _count: { userId: true }
  }).then(async (results) => {
    const userIds = results.map(r => r.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, role: true }
    })
    
    const roleDistribution: Record<string, number> = {}
    users.forEach(user => {
      roleDistribution[user.role] = (roleDistribution[user.role] || 0) + 1
    })
    
    return roleDistribution
  })

  return {
    processingTimeDistribution,
    geographicDistribution: {}, // Would be populated from user profile data
    userRoleDistribution
  }
}

/**
 * Gets compliance-specific metrics
 */
async function getComplianceMetrics(startDate: Date, endDate: Date) {
  const whereClause = {
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  }

  // COPPA compliance metrics
  const parentalConsentRequests = await prisma.userDeletionRequest.findMany({
    where: {
      ...whereClause,
      parentalConsentRequired: true
    },
    select: {
      parentalConsentVerified: true,
      createdAt: true,
      user: {
        select: {
          profile: {
            select: {
              parentalConsentDate: true
            }
          }
        }
      }
    }
  })

  const coppaCompliance = {
    totalMinorRequests: parentalConsentRequests.length,
    parentalConsentGranted: parentalConsentRequests.filter(r => r.parentalConsentVerified).length,
    parentalConsentDenied: parentalConsentRequests.filter(r => r.parentalConsentVerified === false).length,
    avgConsentTime: calculateAverageConsentTime(parentalConsentRequests)
  }

  // GDPR compliance metrics (30-day requirement)
  const completedDeletions = await prisma.userDeletionRequest.findMany({
    where: {
      ...whereClause,
      status: 'HARD_DELETED',
      hardDeletedAt: { not: null }
    },
    select: {
      createdAt: true,
      hardDeletedAt: true
    }
  })

  let within30DayLimit = 0
  let exceeding30Days = 0

  completedDeletions.forEach(deletion => {
    const processingDays = (deletion.hardDeletedAt!.getTime() - deletion.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    
    if (processingDays <= 30) {
      within30DayLimit++
    } else {
      exceeding30Days++
    }
  })

  const gdprCompliance = {
    within30DayLimit,
    exceeding30Days,
    justifiedDelays: 0 // Would track cases with documented justifications
  }

  return {
    coppaCompliance,
    gdprCompliance
  }
}

/**
 * Gets security-related metrics
 */
async function getSecurityMetrics(startDate: Date, endDate: Date) {
  const whereClause = {
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  }

  const systemErrors = await prisma.deletionAuditLog.count({
    where: {
      ...whereClause,
      action: 'SYSTEM_ERROR'
    }
  })

  const suspiciousActivities = await detectSuspiciousActivities(startDate, endDate)
  const integrityViolations = await detectIntegrityViolations(startDate, endDate)

  return {
    totalIncidents: systemErrors + suspiciousActivities + integrityViolations,
    details: {
      suspiciousActivities,
      integrityViolations,
      unauthorizedAccess: 0, // Would be populated from security logs
      systemErrors
    }
  }
}

/**
 * Helper functions for specific calculations
 */
async function getParentalConsentCount(startDate: Date, endDate: Date): Promise<number> {
  return await prisma.userDeletionRequest.count({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      parentalConsentRequired: true
    }
  })
}

async function getAverageProcessingTime(startDate: Date, endDate: Date): Promise<number> {
  const completedDeletions = await prisma.userDeletionRequest.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: 'HARD_DELETED',
      hardDeletedAt: { not: null }
    },
    select: { createdAt: true, hardDeletedAt: true }
  })

  if (completedDeletions.length === 0) return 0

  const totalHours = completedDeletions.reduce((sum, deletion) => {
    return sum + (deletion.hardDeletedAt!.getTime() - deletion.createdAt.getTime()) / (1000 * 60 * 60)
  }, 0)

  return Math.round(totalHours / completedDeletions.length)
}

function calculateComplianceRate(stats: any): number {
  const total = stats.totalRequests
  if (total === 0) return 100
  
  const compliant = (stats.statusBreakdown.HARD_DELETED || 0) + 
                   (stats.statusBreakdown.RECOVERED || 0)
  
  return Math.round((compliant / total) * 100)
}

function calculateAverageConsentTime(requests: any[]): number {
  const withConsentDates = requests.filter(r => 
    r.user?.profile?.parentalConsentDate && r.parentalConsentVerified
  )
  
  if (withConsentDates.length === 0) return 0
  
  const totalHours = withConsentDates.reduce((sum, request) => {
    const consentTime = request.user.profile.parentalConsentDate.getTime() - request.createdAt.getTime()
    return sum + consentTime / (1000 * 60 * 60)
  }, 0)
  
  return Math.round(totalHours / withConsentDates.length)
}

async function detectSuspiciousActivities(startDate: Date, endDate: Date): Promise<number> {
  // Detect multiple requests from same IP
  const suspiciousIPs = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM deletion_audit_logs 
    WHERE created_at >= ${startDate} 
    AND created_at <= ${endDate}
    AND ip_address IS NOT NULL
    AND action = 'REQUEST_CREATED'
    GROUP BY ip_address 
    HAVING COUNT(*) > 3
  `
  
  return suspiciousIPs.length
}

async function detectIntegrityViolations(startDate: Date, endDate: Date): Promise<number> {
  // This would implement actual integrity checking logic
  // For now, return 0 as placeholder
  return 0
}

/**
 * Assesses overall compliance status based on metrics
 */
function assessComplianceStatus(
  summary: AuditReportSummary, 
  details: AuditReportDetails
): 'COMPLIANT' | 'NON_COMPLIANT' | 'REVIEW_REQUIRED' {
  
  // Check for critical compliance failures
  if (summary.complianceRate < 95) {
    return 'NON_COMPLIANT'
  }
  
  if (details.gdprCompliance.exceeding30Days > 0) {
    return 'NON_COMPLIANT'
  }
  
  if (summary.securityIncidents > 5) {
    return 'REVIEW_REQUIRED'
  }
  
  if (details.securityMetrics.integrityViolations > 0) {
    return 'NON_COMPLIANT'
  }
  
  return 'COMPLIANT'
}

/**
 * Generates recommendations based on audit findings
 */
function generateRecommendations(
  summary: AuditReportSummary,
  details: AuditReportDetails,
  complianceStatus: string
): string[] {
  const recommendations: string[] = []
  
  if (summary.complianceRate < 100) {
    recommendations.push('Investigate and resolve failed deletion requests to maintain 100% compliance rate')
  }
  
  if (details.gdprCompliance.exceeding30Days > 0) {
    recommendations.push('Implement automated escalation for deletion requests approaching 30-day GDPR deadline')
  }
  
  if (summary.averageProcessingTime > 168) { // 7 days
    recommendations.push('Optimize deletion processing workflow to reduce average processing time')
  }
  
  if (details.processingTimeDistribution.over30days > 0) {
    recommendations.push('Review and document justifications for deletions exceeding 30 days')
  }
  
  if (details.coppaCompliance.totalMinorRequests > 0 && details.coppaCompliance.avgConsentTime > 72) {
    recommendations.push('Improve parental consent response time through better communication')
  }
  
  if (summary.securityIncidents > 0) {
    recommendations.push('Review security incidents and implement additional monitoring controls')
  }
  
  if (details.securityMetrics.suspiciousActivities > 0) {
    recommendations.push('Investigate suspicious IP activities and consider implementing rate limiting')
  }
  
  if (complianceStatus === 'COMPLIANT' && recommendations.length === 0) {
    recommendations.push('Continue current practices. All compliance metrics are within acceptable ranges.')
  }
  
  return recommendations
}

/**
 * Exports audit report to various formats
 */
export async function exportAuditReport(
  report: AuditReport,
  format: 'JSON' | 'PDF' | 'CSV'
): Promise<string> {
  
  switch (format) {
    case 'JSON':
      return JSON.stringify(report, null, 2)
    
    case 'CSV':
      return generateCSVReport(report)
    
    case 'PDF':
      // Would generate PDF using a library like puppeteer or pdfkit
      return 'PDF generation not implemented'
    
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

/**
 * Generates CSV format of the audit report
 */
function generateCSVReport(report: AuditReport): string {
  const headers = [
    'Metric', 'Value', 'Period', 'Compliance Status'
  ]
  
  const rows = [
    ['Report Type', report.reportType, `${report.period.start.toISOString()} - ${report.period.end.toISOString()}`, report.complianceStatus],
    ['Total Deletion Requests', report.summary.totalDeletionRequests.toString(), '', ''],
    ['Completed Deletions', report.summary.completedDeletions.toString(), '', ''],
    ['Pending Deletions', report.summary.pendingDeletions.toString(), '', ''],
    ['Failed Deletions', report.summary.failedDeletions.toString(), '', ''],
    ['Compliance Rate', `${report.summary.complianceRate}%`, '', ''],
    ['Average Processing Time (hours)', report.summary.averageProcessingTime.toString(), '', ''],
    ['Security Incidents', report.summary.securityIncidents.toString(), '', ''],
    ...report.recommendations.map((rec, idx) => [`Recommendation ${idx + 1}`, rec, '', ''])
  ]
  
  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
}