'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export interface ContentAccessLevel {
  level: 'preview' | 'purchased' | 'subscribed' | 'restricted'
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

export interface PreviewLimits {
  exceeded: boolean
  remaining: number
  resetTime: string
}

/**
 * Hook for managing content access and preview functionality
 */
export function useContentAccess(storyId: string | null) {
  const { data: session } = useSession()
  const [accessLevel, setAccessLevel] = useState<ContentAccessLevel | null>(null)
  const [previewLimits, setPreviewLimits] = useState<PreviewLimits | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check access level for a story
  const checkAccess = async (id: string) => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/library/stories/${id}/purchase`)
      
      if (!response.ok) {
        throw new Error('Failed to check access')
      }

      const data = await response.json()
      
      // Transform API response to match our interface
      const level: ContentAccessLevel = {
        level: data.accessLevel || 'preview',
        canRead: data.hasAccess || false,
        canDownload: data.hasAccess || false,
        previewPercentage: data.hasAccess ? 100 : 20,
        message: data.hasAccess ? undefined : 'Preview available. Sign up to read the full story.'
      }

      setAccessLevel(level)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check access')
    } finally {
      setLoading(false)
    }
  }

  // Track preview usage
  const trackPreview = async (
    id: string,
    metadata: {
      timeSpent: number
      scrollPercentage: number
      source?: string
    }
  ) => {
    if (!id) return

    try {
      await fetch(`/api/library/stories/${id}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timeSpent: metadata.timeSpent,
          scrollPercentage: metadata.scrollPercentage,
          source: metadata.source || 'library'
        })
      })
    } catch (err) {
      console.error('Failed to track preview:', err)
    }
  }

  // Purchase story
  const purchaseStory = async (id: string) => {
    if (!id || !session?.user) {
      throw new Error('Authentication required')
    }

    const response = await fetch(`/api/library/stories/${id}/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Purchase failed')
    }

    const data = await response.json()
    
    // Refresh access level after purchase
    await checkAccess(id)
    
    return data
  }

  // Check access when story ID or session changes
  useEffect(() => {
    if (storyId) {
      checkAccess(storyId)
    }
  }, [storyId, session])

  return {
    accessLevel,
    previewLimits,
    loading,
    error,
    checkAccess,
    trackPreview,
    purchaseStory,
    refetch: () => storyId && checkAccess(storyId)
  }
}

/**
 * Hook for managing user subscription status
 */
export function useSubscription() {
  const { data: session } = useSession()
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = async () => {
    if (!session?.user) {
      setSubscription(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/subscriptions')
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription')
      }

      const data = await response.json()
      setSubscription(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription')
    } finally {
      setLoading(false)
    }
  }

  const subscribe = async (planId: string) => {
    if (!session?.user) {
      throw new Error('Authentication required')
    }

    const response = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ planId })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Subscription failed')
    }

    const data = await response.json()
    
    // Refresh subscription data
    await fetchSubscription()
    
    return data
  }

  const cancelSubscription = async () => {
    if (!session?.user) {
      throw new Error('Authentication required')
    }

    const response = await fetch('/api/subscriptions', {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Cancellation failed')
    }

    const data = await response.json()
    
    // Refresh subscription data
    await fetchSubscription()
    
    return data
  }

  // Fetch subscription when session changes
  useEffect(() => {
    fetchSubscription()
  }, [session])

  return {
    subscription,
    loading,
    error,
    subscribe,
    cancelSubscription,
    refetch: fetchSubscription,
    hasActiveSubscription: subscription?.hasActiveSubscription || false,
    canAccessPremium: subscription?.currentSubscription?.canAccessPremium || false
  }
}

/**
 * Hook for managing shopping cart
 */
export function useCart() {
  const { data: session } = useSession()
  const [cart, setCart] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate session ID for anonymous users
  const getSessionId = () => {
    if (typeof window === 'undefined') return null
    
    let sessionId = localStorage.getItem('cart-session-id')
    if (!sessionId) {
      sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('cart-session-id', sessionId)
    }
    return sessionId
  }

  const fetchCart = async () => {
    setLoading(true)
    setError(null)

    try {
      const sessionId = getSessionId()
      const url = sessionId ? `/api/shop/cart?sessionId=${sessionId}` : '/api/shop/cart'
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch cart')
      }

      const data = await response.json()
      setCart(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cart')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async (productId: string, variantId?: string, quantity: number = 1) => {
    const sessionId = getSessionId()
    
    const response = await fetch('/api/shop/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId,
        variantId,
        quantity,
        sessionId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add to cart')
    }

    // Refresh cart
    await fetchCart()

    return response.json()
  }

  const removeFromCart = async (itemId: string) => {
    const sessionId = getSessionId()
    
    const response = await fetch(`/api/shop/cart?itemId=${itemId}&sessionId=${sessionId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to remove from cart')
    }

    // Refresh cart
    await fetchCart()

    return response.json()
  }

  const clearCart = async () => {
    const sessionId = getSessionId()
    
    const response = await fetch(`/api/shop/cart?clearAll=true&sessionId=${sessionId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to clear cart')
    }

    // Refresh cart
    await fetchCart()

    return response.json()
  }

  // Fetch cart on mount and when session changes
  useEffect(() => {
    fetchCart()
  }, [session])

  return {
    cart,
    loading,
    error,
    addToCart,
    removeFromCart,
    clearCart,
    refetch: fetchCart,
    itemCount: cart?.totals?.itemCount || 0,
    total: cart?.totals?.total || 0,
    isEmpty: cart?.isEmpty !== false
  }
}