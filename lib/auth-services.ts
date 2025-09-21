// IMPROVEMENT 4: Centralized Authorization Service
export class AuthorizationService {
  private static instance: AuthorizationService
  private cache: Map<string, { permissions: Permission[], expiry: number }> = new Map()
  
  static getInstance(): AuthorizationService {
    if (!this.instance) {
      this.instance = new AuthorizationService()
    }
    return this.instance
  }
  
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const cached = this.cache.get(userId)
    if (cached && cached.expiry > Date.now()) {
      return cached.permissions
    }
    
    // Fetch from database with RLS
    const { prisma } = await import("@/lib/prisma")
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    
    const permissions = rolePermissions[user?.role || 'LEARNER'] || []
    
    // Cache for 5 minutes
    this.cache.set(userId, {
      permissions,
      expiry: Date.now() + 5 * 60 * 1000
    })
    
    return permissions
  }
  
  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId)
    return permissions.includes(permission)
  }
  
  clearUserCache(userId: string): void {
    this.cache.delete(userId)
  }
  
  clearAllCache(): void {
    this.cache.clear()
  }
}

// IMPROVEMENT 5: Session Management Service
export class SessionManagementService {
  private static instance: SessionManagementService
  
  static getInstance(): SessionManagementService {
    if (!this.instance) {
      this.instance = new SessionManagementService()
    }
    return this.instance
  }
  
  async trackSessionActivity(userId: string, activity: {
    action: string
    resource?: string
    ipAddress: string
    userAgent: string
  }): Promise<void> {
    const { prisma } = await import("@/lib/prisma")
    
    // Log activity to session_activities table (needs to be created)
    try {
      await prisma.$executeRaw`
        INSERT INTO session_activities (user_id, action, resource, ip_address, user_agent, created_at)
        VALUES (${userId}, ${activity.action}, ${activity.resource || null}, ${activity.ipAddress}, ${activity.userAgent}, NOW())
      `
    } catch (error) {
      console.error('[SESSION] Failed to track activity:', error)
    }
  }
  
  async getActiveSessions(userId: string): Promise<any[]> {
    const { prisma } = await import("@/lib/prisma")
    
    return await prisma.session.findMany({
      where: { 
        userId,
        expires: { gt: new Date() }
      },
      select: {
        id: true,
        sessionToken: true,
        expires: true,
      }
    })
  }
  
  async revokeSession(sessionToken: string): Promise<void> {
    const { prisma } = await import("@/lib/prisma")
    
    await prisma.session.delete({
      where: { sessionToken }
    })
  }
  
  async revokeAllUserSessions(userId: string, exceptSessionToken?: string): Promise<void> {
    const { prisma } = await import("@/lib/prisma")
    
    await prisma.session.deleteMany({
      where: {
        userId,
        ...(exceptSessionToken && {
          sessionToken: { not: exceptSessionToken }
        })
      }
    })
  }
}

// IMPROVEMENT 6: Audit Service
export class AuditService {
  private static instance: AuditService
  
  static getInstance(): AuditService {
    if (!this.instance) {
      this.instance = new AuditService()
    }
    return this.instance
  }
  
  async logSecurityEvent(event: {
    userId?: string
    action: string
    resource: string
    result: 'SUCCESS' | 'FAILURE' | 'WARNING'
    ipAddress: string
    userAgent: string
    metadata?: Record<string, any>
  }): Promise<void> {
    const { prisma } = await import("@/lib/prisma")
    
    try {
      await prisma.$executeRaw`
        INSERT INTO security_audit_log (
          user_id, action, resource, result, ip_address, user_agent, metadata, created_at
        ) VALUES (
          ${event.userId || null},
          ${event.action},
          ${event.resource},
          ${event.result},
          ${event.ipAddress},
          ${event.userAgent},
          ${JSON.stringify(event.metadata || {})},
          NOW()
        )
      `
    } catch (error) {
      console.error('[AUDIT] Failed to log security event:', error)
    }
  }
  
  async getSecurityEvents(filters: {
    userId?: string
    action?: string
    timeRange?: { start: Date, end: Date }
    limit?: number
  }): Promise<any[]> {
    const { prisma } = await import("@/lib/prisma")
    
    // This would need a proper security_audit_log table
    // For now, return empty array
    return []
  }
}
