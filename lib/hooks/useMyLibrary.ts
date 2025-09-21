import { useState, useEffect, useCallback } from 'react'

export interface LibraryStory {
  id: string
  title: string
  subtitle?: string
  summary?: string
  authorName: string
  authorAge?: number
  authorLocation?: string
  language: string
  category: string[]
  tags: string[]
  readingLevel?: string
  readingTime?: number
  coverImage?: string
  isPremium: boolean
  price?: number
  rating?: number
  accessType: 'purchased' | 'subscription'
  purchaseDate?: string
  purchasePrice?: number
  progress?: {
    progress: number
    currentPage: number
    lastReadAt: string
    timeSpent: number
  } | null
  latestBookmark?: {
    id: string
    position: string
    note?: string
    createdAt: string
  } | null
  canDownload: boolean
}

export interface LibrarySubscription {
  id: string
  plan: string
  status: string
  canAccessPremium: boolean
  unlimitedReading: boolean
  startDate: string
  endDate?: string
}

export interface LibraryStats {
  totalPurchased: number
  totalSubscriptionAccess: number
  currentlyReading: number
}

export interface MyLibraryResponse {
  stories: LibraryStory[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  subscription: LibrarySubscription | null
  stats: LibraryStats
}

interface UseMyLibraryOptions {
  initialPage?: number
  initialLimit?: number
  initialType?: 'purchased' | 'subscription' | 'all'
  initialCategory?: string
  initialStatus?: 'reading' | 'completed' | 'bookmarked'
  autoFetch?: boolean
}

export function useMyLibrary(options: UseMyLibraryOptions = {}) {
  const {
    initialPage = 1,
    initialLimit = 12,
    initialType = 'all',
    initialCategory = 'all',
    initialStatus,
    autoFetch = true
  } = options

  // State
  const [data, setData] = useState<MyLibraryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [page, setPage] = useState(initialPage)
  const [limit] = useState(initialLimit)
  const [type, setType] = useState<'purchased' | 'subscription' | 'all'>(initialType)
  const [category, setCategory] = useState(initialCategory)
  const [status, setStatus] = useState<'reading' | 'completed' | 'bookmarked' | undefined>(initialStatus)

  // Fetch function
  const fetchLibrary = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })

      if (type !== 'all') params.set('type', type)
      if (category !== 'all') params.set('category', category)
      if (status) params.set('status', status)

      const response = await fetch(`/api/library/my-library?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch library')
      }

      const result: MyLibraryResponse = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load library')
    } finally {
      setLoading(false)
    }
  }, [page, limit, type, category, status])

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    if (autoFetch) {
      fetchLibrary()
    }
  }, [fetchLibrary, autoFetch])

  // Helper functions
  const goToPage = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const nextPage = useCallback(() => {
    if (data?.pagination.hasNext) {
      setPage(prev => prev + 1)
    }
  }, [data?.pagination.hasNext])

  const prevPage = useCallback(() => {
    if (data?.pagination.hasPrev) {
      setPage(prev => prev - 1)
    }
  }, [data?.pagination.hasPrev])

  const setFilters = useCallback((filters: {
    type?: 'purchased' | 'subscription' | 'all'
    category?: string
    status?: 'reading' | 'completed' | 'bookmarked'
  }) => {
    if (filters.type !== undefined) setType(filters.type)
    if (filters.category !== undefined) setCategory(filters.category)
    if (filters.status !== undefined) setStatus(filters.status)
    setPage(1) // Reset to first page when filters change
  }, [])

  const clearFilters = useCallback(() => {
    setType('all')
    setCategory('all')
    setStatus(undefined)
    setPage(1)
  }, [])

  const refresh = useCallback(() => {
    fetchLibrary()
  }, [fetchLibrary])

  // Derived state
  const hasSubscription = data?.subscription?.status === 'ACTIVE'
  const canAccessPremium = data?.subscription?.canAccessPremium || false
  const stories = data?.stories || []
  const pagination = data?.pagination || null
  const subscription = data?.subscription || null
  const stats = data?.stats || { totalPurchased: 0, totalSubscriptionAccess: 0, currentlyReading: 0 }

  // Filter options for UI
  const filterOptions = {
    types: [
      { value: 'all', label: 'All Stories', count: stats.totalPurchased + stats.totalSubscriptionAccess },
      { value: 'purchased', label: 'Purchased', count: stats.totalPurchased },
      { value: 'subscription', label: 'Subscription', count: stats.totalSubscriptionAccess }
    ],
    statuses: [
      { value: undefined, label: 'All Progress' },
      { value: 'reading', label: 'Currently Reading', count: stats.currentlyReading },
      { value: 'completed', label: 'Completed' },
      { value: 'bookmarked', label: 'Bookmarked' }
    ]
  }

  return {
    // Data
    stories,
    pagination,
    subscription,
    stats,
    loading,
    error,

    // Filter state
    filters: {
      page,
      limit,
      type,
      category,
      status
    },

    // Filter options
    filterOptions,

    // Computed state
    hasSubscription,
    canAccessPremium,
    isEmpty: !loading && stories.length === 0,
    hasError: !!error,

    // Actions
    fetchLibrary,
    refresh,
    goToPage,
    nextPage,
    prevPage,
    setFilters,
    clearFilters,

    // Direct filter setters (for specific use cases)
    setPage,
    setType,
    setCategory,
    setStatus
  }
}

// Individual story hook for detailed operations
export function useLibraryStory(storyId: string) {
  const [story, setStory] = useState<LibraryStory | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStory = useCallback(async () => {
    if (!storyId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/library/stories/${storyId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch story')
      }

      const result = await response.json()
      setStory(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load story')
    } finally {
      setLoading(false)
    }
  }, [storyId])

  useEffect(() => {
    fetchStory()
  }, [fetchStory])

  return {
    story,
    loading,
    error,
    refresh: fetchStory
  }
}

export default useMyLibrary