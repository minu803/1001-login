// IMPROVEMENT 7: Enhanced API Route Protection
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export interface ApiAuthOptions {
  requiredRole?: string[]
  requiredPermissions?: string[]
  allowAnonymous?: boolean
  rateLimitKey?: string
}

export function withAuth(handler: Function, options: ApiAuthOptions = {}) {
  return async (request: NextRequest, context?: any) => {
    try {
      // Get session
      const session = await getServerSession(authOptions)
      
      // Check if anonymous access is allowed
      if (!session && !options.allowAnonymous) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      
      // Check role requirements
      if (session && options.requiredRole && options.requiredRole.length > 0) {
        const userRole = session.user.role
        if (!options.requiredRole.includes(userRole)) {
          // Log unauthorized access attempt
          console.warn(`[AUTH] Unauthorized access attempt: ${session.user.email} (${userRole}) tried to access ${request.url}`)
          
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          )
        }
      }
      
      // Add security headers
      const response = await handler(request, context)
      
      if (response instanceof NextResponse) {
        // Add security headers
        response.headers.set('X-Content-Type-Options', 'nosniff')
        response.headers.set('X-Frame-Options', 'DENY')
        response.headers.set('X-XSS-Protection', '1; mode=block')
        
        // Add audit trail
        if (session) {
          response.headers.set('X-User-Id', session.user.id)
        }
      }
      
      return response
    } catch (error) {
      console.error('[AUTH] API protection error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// IMPROVEMENT 8: Centralized Route Configuration
export const ROUTE_PERMISSIONS = {
  // Admin routes
  '/api/admin/*': { requiredRole: ['ADMIN'] },
  '/api/admin/users': { requiredRole: ['ADMIN'] },
  '/api/admin/settings': { requiredRole: ['ADMIN'] },
  
  // Volunteer routes
  '/api/volunteer/*': { requiredRole: ['VOLUNTEER', 'ADMIN'] },
  '/api/volunteer/projects': { requiredRole: ['VOLUNTEER', 'ADMIN'] },
  
  // Teacher routes
  '/api/teacher/*': { requiredRole: ['TEACHER', 'ADMIN'] },
  '/api/teacher/classes': { requiredRole: ['TEACHER', 'ADMIN'] },
  
  // Public routes
  '/api/library/books': { allowAnonymous: true },
  '/api/shop/products': { allowAnonymous: true },
  
  // Authenticated routes
  '/api/user/profile': { requiredRole: ['LEARNER', 'TEACHER', 'INSTITUTION', 'VOLUNTEER', 'ADMIN'] },
  '/api/dashboard/*': { requiredRole: ['LEARNER', 'TEACHER', 'INSTITUTION', 'VOLUNTEER', 'ADMIN'] },
} as const

// IMPROVEMENT 9: Enhanced Rate Limiting
export class EnhancedRateLimiter {
  private static instance: EnhancedRateLimiter
  private store: Map<string, { count: number; resetTime: number; blocked: boolean }> = new Map()
  
  static getInstance(): EnhancedRateLimiter {
    if (!this.instance) {
      this.instance = new EnhancedRateLimiter()
    }
    return this.instance
  }
  
  async checkLimit(identifier: string, config: {
    maxRequests: number
    windowMs: number
    blockDuration?: number
  }): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    blocked?: boolean
  }> {
    const now = Date.now()
    const key = identifier
    const existing = this.store.get(key)
    
    // Check if currently blocked
    if (existing?.blocked && now < existing.resetTime) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: existing.resetTime,
        blocked: true
      }
    }
    
    // Reset if window expired
    if (!existing || now > existing.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
        blocked: false
      })
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      }
    }
    
    // Increment count
    existing.count++
    
    // Check if limit exceeded
    if (existing.count > config.maxRequests) {
      // Block if configured
      if (config.blockDuration) {
        existing.blocked = true
        existing.resetTime = now + config.blockDuration
      }
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: existing.resetTime,
        blocked: !!config.blockDuration
      }
    }
    
    return {
      allowed: true,
      remaining: config.maxRequests - existing.count,
      resetTime: existing.resetTime
    }
  }
  
  clearCache(): void {
    this.store.clear()
  }
}

// Usage example:
/*
export const GET = withAuth(async (request: NextRequest) => {
  // Your API logic here
  return NextResponse.json({ data: 'protected data' })
}, {
  requiredRole: ['ADMIN', 'VOLUNTEER'],
  rateLimitKey: 'admin-api'
})
*/
