import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { createRLSBypassAdapter } from "@/lib/auth-adapter"

// IMPROVEMENT 1: Enhanced Session Management
export const enhancedAuthOptions: NextAuthOptions = {
  // Switch to database sessions for better security and scalability
  session: {
    strategy: "database", // Instead of JWT
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 2 * 60 * 60, // 2 hours
    generateSessionToken: () => {
      // Custom session token generation for better security
      return require('crypto').randomBytes(32).toString('hex')
    }
  },
  
  // Enhanced callbacks with better error handling
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      try {
        // Add comprehensive logging
        console.log(`[AUTH] Sign-in attempt: ${user.email}, provider: ${account?.provider}`)
        
        // Enhanced security checks
        if (account?.provider === 'credentials') {
          // Additional validation for password-based login
          const userRole = (user as any).role
          if (!['ADMIN', 'VOLUNTEER'].includes(userRole)) {
            console.warn(`[AUTH] Invalid role for credentials login: ${userRole}`)
            return false
          }
        }
        
        return true
      } catch (error) {
        console.error('[AUTH] Sign-in error:', error)
        return false
      }
    },

    async session({ session, user, token }) {
      // Enhanced session data with audit trail
      if (session?.user && user) {
        session.user.id = user.id
        session.user.role = (user as any).role || 'LEARNER'
        session.user.emailVerified = (user as any).emailVerified
        
        // Add last activity tracking
        session.lastActivity = new Date().toISOString()
        
        // Add session metadata for security
        session.metadata = {
          provider: (user as any).provider || 'email',
          createdAt: session.expires, // Will be overridden by actual creation time
        }
      }
      return session
    }
  }
}

// IMPROVEMENT 2: Permission-Based Access Control (PBAC)
export enum Permission {
  // Content permissions
  READ_STORIES = 'read:stories',
  WRITE_STORIES = 'write:stories',
  PUBLISH_STORIES = 'publish:stories',
  
  // User management
  READ_USERS = 'read:users',
  MANAGE_USERS = 'manage:users',
  
  // System administration
  SYSTEM_CONFIG = 'system:config',
  ANALYTICS_VIEW = 'analytics:view',
  
  // Commerce
  MANAGE_PRODUCTS = 'manage:products',
  VIEW_ORDERS = 'view:orders',
}

export const rolePermissions: Record<string, Permission[]> = {
  LEARNER: [
    Permission.READ_STORIES,
  ],
  TEACHER: [
    Permission.READ_STORIES,
    Permission.WRITE_STORIES,
  ],
  INSTITUTION: [
    Permission.READ_STORIES,
    Permission.WRITE_STORIES,
    Permission.READ_USERS,
  ],
  VOLUNTEER: [
    Permission.READ_STORIES,
    Permission.WRITE_STORIES,
    Permission.PUBLISH_STORIES,
  ],
  ADMIN: Object.values(Permission), // All permissions
}

export function hasPermission(userRole: string, permission: Permission): boolean {
  const permissions = rolePermissions[userRole] || []
  return permissions.includes(permission)
}

// IMPROVEMENT 3: Enhanced Security Middleware
export interface SecurityContext {
  userId: string
  role: string
  permissions: Permission[]
  sessionId: string
  ipAddress: string
  userAgent: string
  lastActivity: Date
}

export async function createSecurityContext(session: any, request: any): Promise<SecurityContext> {
  const permissions = rolePermissions[session.user.role] || []
  
  return {
    userId: session.user.id,
    role: session.user.role,
    permissions,
    sessionId: session.sessionId || 'unknown',
    ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    lastActivity: new Date(),
  }
}
