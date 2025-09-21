import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Content Access Control System
 * 
 * Manages tiered access to stories and content based on user subscription,
 * purchases, and preview limits.
 */

export enum ContentAccess {
  PREVIEW = 'preview',     // First 20% free
  PURCHASED = 'purchased', // One-time purchase
  SUBSCRIBED = 'subscribed', // Active subscription
  RESTRICTED = 'restricted' // No access
}

export interface AccessResult {
  level: ContentAccess
  canRead: boolean
  canDownload: boolean
  previewPercentage: number
  message?: string
  upgradeOptions?: {
    purchase?: {
      price: number
      currency: string
    }
    subscription?: {
      plan: string
      price: number
      currency: string
    }
  }
}

export interface ContentPreview {
  content: string
  isComplete: boolean
  previewPercentage: number
  remainingCharacters: number
}

/**
 * Check user's access level for a specific story
 */
export async function checkStoryAccess(
  storyId: string, 
  userId?: string
): Promise<AccessResult> {
  try {
    // Get story details
    const story = await prisma.story.findFirst({
      where: {
        id: storyId,
        isPublished: true,
        author: {
          deletedAt: null
        }
      },
      select: {
        id: true,
        title: true,
        isPremium: true,
        price: true
      }
    })
    
    if (!story) {
      return {
        level: ContentAccess.RESTRICTED,
        canRead: false,
        canDownload: false,
        previewPercentage: 0,
        message: 'Story not found or unavailable'
      }
    }
    
    // Free stories are always accessible
    if (!story.isPremium) {
      return {
        level: ContentAccess.SUBSCRIBED,
        canRead: true,
        canDownload: true,
        previewPercentage: 100
      }
    }
    
    // For premium stories, check user access
    if (!userId) {
      return {
        level: ContentAccess.PREVIEW,
        canRead: true,
        canDownload: false,
        previewPercentage: 20,
        message: 'Preview available. Sign up to read the full story.',
        upgradeOptions: {
          purchase: story.price ? {
            price: Number(story.price),
            currency: 'USD'
          } : undefined,
          subscription: {
            plan: 'basic',
            price: 9.99,
            currency: 'USD'
          }
        }
      }
    }
    
    // Check user's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        status: true,
        canAccessPremium: true,
        unlimitedReading: true
      }
    })
    
    if (subscription?.status === 'ACTIVE' && subscription.canAccessPremium) {
      return {
        level: ContentAccess.SUBSCRIBED,
        canRead: true,
        canDownload: subscription.unlimitedReading,
        previewPercentage: 100
      }
    }
    
    // Check if user has purchased this story
    const purchase = await prisma.order.findFirst({
      where: {
        userId,
        status: { in: ['DELIVERED', 'PROCESSING'] },
        items: {
          some: {
            productId: storyId
          }
        }
      }
    })
    
    if (purchase) {
      return {
        level: ContentAccess.PURCHASED,
        canRead: true,
        canDownload: true,
        previewPercentage: 100
      }
    }
    
    // Default to preview for authenticated users
    return {
      level: ContentAccess.PREVIEW,
      canRead: true,
      canDownload: false,
      previewPercentage: 20,
      message: 'Preview available. Purchase or subscribe to read the full story.',
      upgradeOptions: {
        purchase: story.price ? {
          price: Number(story.price),
          currency: 'USD'
        } : undefined,
        subscription: {
          plan: 'basic',
          price: 9.99,
          currency: 'USD'
        }
      }
    }
    
  } catch (error) {
    console.error('Error checking story access:', error)
    return {
      level: ContentAccess.RESTRICTED,
      canRead: false,
      canDownload: false,
      previewPercentage: 0,
      message: 'Error checking access permissions'
    }
  }
}

/**
 * Get content preview based on access level
 */
export function getContentPreview(
  content: string,
  accessLevel: ContentAccess,
  previewPercentage: number = 20
): ContentPreview {
  if (accessLevel === ContentAccess.SUBSCRIBED || accessLevel === ContentAccess.PURCHASED) {
    return {
      content,
      isComplete: true,
      previewPercentage: 100,
      remainingCharacters: 0
    }
  }
  
  if (accessLevel === ContentAccess.PREVIEW) {
    const previewLength = Math.floor(content.length * (previewPercentage / 100))
    const previewContent = content.substring(0, previewLength)
    
    // Try to end at a sentence or paragraph break for better UX
    const lastSentence = previewContent.lastIndexOf('.')
    const lastParagraph = previewContent.lastIndexOf('\n\n')
    const cutoff = Math.max(lastSentence, lastParagraph)
    
    const finalContent = cutoff > previewLength * 0.8 
      ? previewContent.substring(0, cutoff + 1)
      : previewContent
    
    return {
      content: finalContent,
      isComplete: false,
      previewPercentage,
      remainingCharacters: content.length - finalContent.length
    }
  }
  
  return {
    content: '',
    isComplete: false,
    previewPercentage: 0,
    remainingCharacters: content.length
  }
}

/**
 * Track preview usage for analytics and rate limiting
 */
export async function trackPreviewUsage(
  storyId: string,
  userId: string | null,
  sessionId: string | null,
  metadata: {
    timeSpent: number
    scrollPercentage: number
    source: string
    userAgent?: string
  }
): Promise<void> {
  try {
    const baseData = {
      storyId,
      ...metadata,
      timestamp: new Date()
    }
    
    if (userId) {
      // Track for authenticated users
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'STORY_PREVIEW_TRACKED',
          entity: 'STORY',
          entityId: storyId,
          metadata: baseData
        }
      })
    } else if (sessionId) {
      // Track for anonymous users (could use a separate analytics table)
      console.log('Anonymous preview tracking:', { sessionId, ...baseData })
    }
  } catch (error) {
    console.error('Error tracking preview usage:', error)
  }
}

/**
 * Check if user has reached preview limits (anti-abuse)
 */
export async function checkPreviewLimits(
  userId: string | null,
  sessionId: string | null
): Promise<{ exceeded: boolean; remaining: number; resetTime: Date }> {
  const hourlyLimit = 10 // Max 10 preview sessions per hour
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  
  try {
    let previewCount = 0
    
    if (userId) {
      previewCount = await prisma.activityLog.count({
        where: {
          userId,
          action: 'STORY_PREVIEW_TRACKED',
          createdAt: {
            gte: oneHourAgo
          }
        }
      })
    } else {
      // For anonymous users, implement session-based tracking
      // This is a placeholder - you might want to use Redis or another solution
      previewCount = 0
    }
    
    const exceeded = previewCount >= hourlyLimit
    const remaining = Math.max(0, hourlyLimit - previewCount)
    const resetTime = new Date(now.getTime() + 60 * 60 * 1000)
    
    return {
      exceeded,
      remaining,
      resetTime
    }
    
  } catch (error) {
    console.error('Error checking preview limits:', error)
    return {
      exceeded: false,
      remaining: hourlyLimit,
      resetTime: new Date(now.getTime() + 60 * 60 * 1000)
    }
  }
}

/**
 * Get user's subscription status and features
 */
export async function getUserSubscriptionFeatures(userId: string): Promise<{
  hasActiveSubscription: boolean
  plan: string
  features: {
    canAccessPremium: boolean
    canDownloadPDF: boolean
    canCreateClasses: boolean
    unlimitedReading: boolean
    maxStudents: number
    maxDownloads: number
  }
}> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        status: true,
        canAccessPremium: true,
        canDownloadPDF: true,
        canCreateClasses: true,
        unlimitedReading: true,
        maxStudents: true,
        maxDownloads: true
      }
    })
    
    if (!subscription || subscription.status !== 'ACTIVE') {
      return {
        hasActiveSubscription: false,
        plan: 'free',
        features: {
          canAccessPremium: false,
          canDownloadPDF: false,
          canCreateClasses: false,
          unlimitedReading: false,
          maxStudents: 0,
          maxDownloads: 3
        }
      }
    }
    
    return {
      hasActiveSubscription: true,
      plan: subscription.plan.toLowerCase(),
      features: {
        canAccessPremium: subscription.canAccessPremium,
        canDownloadPDF: subscription.canDownloadPDF,
        canCreateClasses: subscription.canCreateClasses,
        unlimitedReading: subscription.unlimitedReading,
        maxStudents: subscription.maxStudents,
        maxDownloads: subscription.maxDownloads
      }
    }
    
  } catch (error) {
    console.error('Error getting subscription features:', error)
    return {
      hasActiveSubscription: false,
      plan: 'free',
      features: {
        canAccessPremium: false,
        canDownloadPDF: false,
        canCreateClasses: false,
        unlimitedReading: false,
        maxStudents: 0,
        maxDownloads: 3
      }
    }
  }
}

/**
 * Helper function to get current user session and access info
 */
export async function getCurrentUserAccess(): Promise<{
  userId: string | null
  subscription: Awaited<ReturnType<typeof getUserSubscriptionFeatures>>
}> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id || null
  
  const subscription = userId 
    ? await getUserSubscriptionFeatures(userId)
    : {
        hasActiveSubscription: false,
        plan: 'free',
        features: {
          canAccessPremium: false,
          canDownloadPDF: false,
          canCreateClasses: false,
          unlimitedReading: false,
          maxStudents: 0,
          maxDownloads: 3
        }
      }
  
  return {
    userId,
    subscription
  }
}