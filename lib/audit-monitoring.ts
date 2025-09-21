import { prisma } from '@/lib/prisma'
import { DeletionAction, DeletionStatus } from '@prisma/client'
import { createDeletionAuditLog } from '@/lib/gdpr-deletion'

/**
 * Real-time Audit Log Monitoring and Alert System
 * 
 * Provides continuous monitoring of deletion audit logs and generates
 * alerts for suspicious activities or compliance violations.
 */

export interface AlertRule {
  id: string
  name: string
  description: string
  condition: AlertCondition
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  enabled: boolean
  notificationChannels: string[]
}

export interface AlertCondition {
  type: 'COUNT' | 'TIME_THRESHOLD' | 'PATTERN' | 'INTEGRITY_VIOLATION'
  parameters: {
    action?: DeletionAction
    timeWindow?: number // minutes
    threshold?: number
    pattern?: string
    comparison?: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS'
  }
}

export interface Alert {
  id: string
  ruleId: string
  ruleName: string
  severity: string
  title: string
  description: string
  metadata: any
  triggeredAt: Date
  resolved: boolean
  resolvedAt?: Date
  resolvedBy?: string
}

// In-memory storage for demonstration (use Redis in production)
const activeAlerts = new Map<string, Alert>()
const alertRules = new Map<string, AlertRule>()

/**
 * Initialize default alert rules for deletion audit monitoring
 */
export function initializeAuditMonitoring(): void {
  const defaultRules: AlertRule[] = [
    {
      id: 'multiple_deletion_requests',
      name: 'Multiple Deletion Requests',
      description: 'Alert when more than 5 deletion requests are created in 1 hour',
      condition: {
        type: 'COUNT',
        parameters: {
          action: 'REQUEST_CREATED',
          timeWindow: 60,
          threshold: 5,
          comparison: 'GREATER_THAN'
        }
      },
      severity: 'MEDIUM',
      enabled: true,
      notificationChannels: ['email', 'slack']
    },
    {
      id: 'failed_deletions',
      name: 'Failed Deletion Processes',
      description: 'Alert when deletion processes fail',
      condition: {
        type: 'COUNT',
        parameters: {
          action: 'SYSTEM_ERROR',
          timeWindow: 60,
          threshold: 1,
          comparison: 'GREATER_THAN'
        }
      },
      severity: 'HIGH',
      enabled: true,
      notificationChannels: ['email', 'slack', 'webhook']
    },
    {
      id: 'suspicious_ip_activity',
      name: 'Suspicious IP Activity',
      description: 'Alert when multiple deletion requests come from the same IP',
      condition: {
        type: 'PATTERN',
        parameters: {
          timeWindow: 30,
          threshold: 3,
          pattern: 'same_ip_multiple_requests'
        }
      },
      severity: 'HIGH',
      enabled: true,
      notificationChannels: ['email', 'slack']
    },
    {
      id: 'integrity_violations',
      name: 'Audit Log Integrity Violations',
      description: 'Alert when audit log integrity checks fail',
      condition: {
        type: 'INTEGRITY_VIOLATION',
        parameters: {
          threshold: 1,
          comparison: 'GREATER_THAN'
        }
      },
      severity: 'CRITICAL',
      enabled: true,
      notificationChannels: ['email', 'slack', 'webhook', 'sms']
    },
    {
      id: 'parental_consent_timeout',
      name: 'Parental Consent Timeout',
      description: 'Alert when parental consent requests are approaching expiry',
      condition: {
        type: 'TIME_THRESHOLD',
        parameters: {
          timeWindow: 24, // 24 hours before expiry
          comparison: 'LESS_THAN'
        }
      },
      severity: 'MEDIUM',
      enabled: true,
      notificationChannels: ['email']
    }
  ]

  defaultRules.forEach(rule => {
    alertRules.set(rule.id, rule)
  })

  console.log('Audit monitoring initialized with', alertRules.size, 'alert rules')
}

/**
 * Monitors audit log entries for suspicious patterns and violations
 */
export async function monitorAuditLogEntry(auditLogId: string): Promise<void> {
  try {
    const auditLog = await prisma.deletionAuditLog.findUnique({
      where: { id: auditLogId },
      include: {
        deletionRequest: {
          include: {
            user: {
              select: { id: true, email: true, role: true }
            }
          }
        }
      }
    })

    if (!auditLog) return

    // Check each alert rule
    for (const [ruleId, rule] of alertRules.entries()) {
      if (!rule.enabled) continue

      try {
        const shouldAlert = await evaluateAlertRule(rule, auditLog)
        if (shouldAlert) {
          await triggerAlert(rule, auditLog)
        }
      } catch (error) {
        console.error(`Error evaluating alert rule ${ruleId}:`, error)
      }
    }

  } catch (error) {
    console.error('Error monitoring audit log entry:', error)
  }
}

/**
 * Evaluates whether an alert rule should trigger based on audit log data
 */
async function evaluateAlertRule(rule: AlertRule, auditLog: any): Promise<boolean> {
  const { condition } = rule
  const now = new Date()

  switch (condition.type) {
    case 'COUNT':
      return await evaluateCountCondition(condition, auditLog, now)
    
    case 'TIME_THRESHOLD':
      return await evaluateTimeThresholdCondition(condition, auditLog, now)
    
    case 'PATTERN':
      return await evaluatePatternCondition(condition, auditLog, now)
    
    case 'INTEGRITY_VIOLATION':
      return await evaluateIntegrityCondition(condition, auditLog)
    
    default:
      return false
  }
}

/**
 * Evaluates count-based alert conditions
 */
async function evaluateCountCondition(condition: AlertCondition, auditLog: any, now: Date): Promise<boolean> {
  const { action, timeWindow, threshold, comparison } = condition.parameters
  
  if (!timeWindow || !threshold) return false

  const startTime = new Date(now.getTime() - timeWindow * 60 * 1000)
  
  const whereClause: any = {
    createdAt: {
      gte: startTime,
      lte: now
    }
  }
  
  if (action) {
    whereClause.action = action
  }

  const count = await prisma.deletionAuditLog.count({ where: whereClause })
  
  switch (comparison) {
    case 'GREATER_THAN':
      return count > threshold
    case 'LESS_THAN':
      return count < threshold
    case 'EQUALS':
      return count === threshold
    default:
      return false
  }
}

/**
 * Evaluates time-based threshold conditions
 */
async function evaluateTimeThresholdCondition(condition: AlertCondition, auditLog: any, now: Date): Promise<boolean> {
  const { timeWindow } = condition.parameters
  
  if (!timeWindow) return false

  // Check for parental consent timeouts
  if (auditLog.deletionRequest?.parentalConsentRequired && auditLog.deletionRequest?.parentConfirmationExpiry) {
    const expiryTime = new Date(auditLog.deletionRequest.parentConfirmationExpiry)
    const warningTime = new Date(expiryTime.getTime() - timeWindow * 60 * 60 * 1000)
    
    return now >= warningTime && now < expiryTime
  }

  return false
}

/**
 * Evaluates pattern-based conditions
 */
async function evaluatePatternCondition(condition: AlertCondition, auditLog: any, now: Date): Promise<boolean> {
  const { pattern, timeWindow, threshold } = condition.parameters
  
  if (!timeWindow || !threshold) return false

  switch (pattern) {
    case 'same_ip_multiple_requests':
      if (!auditLog.ipAddress) return false
      
      const startTime = new Date(now.getTime() - timeWindow * 60 * 1000)
      const sameIpCount = await prisma.deletionAuditLog.count({
        where: {
          ipAddress: auditLog.ipAddress,
          action: 'REQUEST_CREATED',
          createdAt: {
            gte: startTime,
            lte: now
          }
        }
      })
      
      return sameIpCount >= threshold
    
    default:
      return false
  }
}

/**
 * Evaluates integrity violation conditions
 */
async function evaluateIntegrityCondition(condition: AlertCondition, auditLog: any): Promise<boolean> {
  // Check if this audit log has integrity issues
  if (auditLog.metadata?.integrityViolation) {
    return true
  }

  // Additional integrity checks could be performed here
  return false
}

/**
 * Triggers an alert based on rule evaluation
 */
async function triggerAlert(rule: AlertRule, auditLog: any): Promise<void> {
  const alertId = `${rule.id}_${Date.now()}`
  
  const alert: Alert = {
    id: alertId,
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    title: `Security Alert: ${rule.name}`,
    description: generateAlertDescription(rule, auditLog),
    metadata: {
      auditLogId: auditLog.id,
      deletionRequestId: auditLog.deletionRequestId,
      action: auditLog.action,
      userId: auditLog.deletionRequest?.userId,
      ipAddress: auditLog.ipAddress?.substring(0, 8) + '...', // Masked
      triggeredBy: rule.condition
    },
    triggeredAt: new Date(),
    resolved: false
  }

  // Store alert
  activeAlerts.set(alertId, alert)

  // Log the alert creation
  await createDeletionAuditLog({
    deletionRequestId: auditLog.deletionRequestId,
    action: 'SYSTEM_ERROR', // Using existing enum, could add ALERT_TRIGGERED
    performedByType: 'AUTOMATED',
    details: `Security alert triggered: ${rule.name}`,
    metadata: {
      alertId,
      ruleName: rule.name,
      severity: rule.severity,
      triggeredBy: auditLog.id
    }
  })

  // Send notifications
  await sendAlertNotifications(alert, rule.notificationChannels)

  console.log(`SECURITY_ALERT: ${rule.severity}`, {
    alertId,
    ruleName: rule.name,
    auditLogId: auditLog.id,
    userId: auditLog.deletionRequest?.userId,
    timestamp: new Date().toISOString()
  })
}

/**
 * Generates human-readable alert descriptions
 */
function generateAlertDescription(rule: AlertRule, auditLog: any): string {
  const userId = auditLog.deletionRequest?.userId || 'unknown'
  const action = auditLog.action
  const timestamp = auditLog.createdAt.toISOString()

  switch (rule.id) {
    case 'multiple_deletion_requests':
      return `Multiple deletion requests detected. Last request by user ${userId} at ${timestamp}.`
    
    case 'failed_deletions':
      return `Deletion process failure detected for user ${userId} at ${timestamp}. Action: ${action}`
    
    case 'suspicious_ip_activity':
      return `Suspicious activity detected from IP address. Multiple deletion requests for user ${userId}.`
    
    case 'integrity_violations':
      return `Audit log integrity violation detected for deletion request ${auditLog.deletionRequestId}.`
    
    case 'parental_consent_timeout':
      return `Parental consent request for user ${userId} is approaching expiry.`
    
    default:
      return `Security alert triggered: ${rule.description}`
  }
}

/**
 * Sends alert notifications through configured channels
 */
async function sendAlertNotifications(alert: Alert, channels: string[]): Promise<void> {
  const promises = channels.map(async (channel) => {
    try {
      switch (channel) {
        case 'email':
          await sendEmailAlert(alert)
          break
        case 'slack':
          await sendSlackAlert(alert)
          break
        case 'webhook':
          await sendWebhookAlert(alert)
          break
        case 'sms':
          await sendSMSAlert(alert)
          break
        default:
          console.warn(`Unknown notification channel: ${channel}`)
      }
    } catch (error) {
      console.error(`Failed to send ${channel} notification:`, error)
    }
  })

  await Promise.allSettled(promises)
}

/**
 * Sends email alert (placeholder implementation)
 */
async function sendEmailAlert(alert: Alert): Promise<void> {
  // Implementation would integrate with email service
  console.log(`EMAIL_ALERT: ${alert.severity} - ${alert.title}`)
}

/**
 * Sends Slack alert (placeholder implementation)
 */
async function sendSlackAlert(alert: Alert): Promise<void> {
  // Implementation would integrate with Slack API
  console.log(`SLACK_ALERT: ${alert.severity} - ${alert.title}`)
}

/**
 * Sends webhook alert (placeholder implementation)
 */
async function sendWebhookAlert(alert: Alert): Promise<void> {
  // Implementation would send HTTP POST to configured webhook
  console.log(`WEBHOOK_ALERT: ${alert.severity} - ${alert.title}`)
}

/**
 * Sends SMS alert (placeholder implementation)
 */
async function sendSMSAlert(alert: Alert): Promise<void> {
  // Implementation would integrate with SMS service
  console.log(`SMS_ALERT: ${alert.severity} - ${alert.title}`)
}

/**
 * Gets active alerts for admin dashboard
 */
export function getActiveAlerts(): Alert[] {
  return Array.from(activeAlerts.values())
    .filter(alert => !alert.resolved)
    .sort((a, b) => {
      // Sort by severity, then by date
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
      const severityDiff = (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
                          (severityOrder[a.severity as keyof typeof severityOrder] || 0)
      
      if (severityDiff !== 0) return severityDiff
      return b.triggeredAt.getTime() - a.triggeredAt.getTime()
    })
}

/**
 * Resolves an alert
 */
export async function resolveAlert(alertId: string, resolvedBy: string, notes?: string): Promise<boolean> {
  const alert = activeAlerts.get(alertId)
  if (!alert) return false

  alert.resolved = true
  alert.resolvedAt = new Date()
  alert.resolvedBy = resolvedBy

  // Log alert resolution
  console.log(`ALERT_RESOLVED: ${alertId}`, {
    ruleName: alert.ruleName,
    resolvedBy,
    resolvedAt: alert.resolvedAt.toISOString(),
    notes
  })

  return true
}

/**
 * Gets alert statistics for dashboard
 */
export function getAlertStatistics(timeWindow: number = 24): any {
  const now = new Date()
  const since = new Date(now.getTime() - timeWindow * 60 * 60 * 1000)
  
  const alerts = Array.from(activeAlerts.values())
    .filter(alert => alert.triggeredAt >= since)

  const bySeverity = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const byRule = alerts.reduce((acc, alert) => {
    acc[alert.ruleName] = (acc[alert.ruleName] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    totalAlerts: alerts.length,
    activeAlerts: alerts.filter(a => !a.resolved).length,
    resolvedAlerts: alerts.filter(a => a.resolved).length,
    bySeverity,
    byRule,
    timeWindow: `${timeWindow} hours`
  }
}