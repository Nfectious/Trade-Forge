/**
 * usePortfolio Hook
 * Operation Phoenix | Trading Forge
 * For Madison
 * 
 * Custom hook for fetching and managing portfolio data
 */

import { useState, useEffect, useCallback } from 'react'
import { apiClient, PortfolioResponse } from '@/lib/api'

interface UsePortfolioReturn {
  portfolio: PortfolioResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePortfolio(autoRefresh: boolean = true): UsePortfolioReturn {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPortfolio = useCallback(async () => {
    try {
      setError(null)
      const response = await apiClient.get<PortfolioResponse>('/trading/portfolio')
      setPortfolio(response.data)
    } catch (err: any) {
      console.error('Failed to fetch portfolio:', err)
      
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.')
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Failed to load portfolio data')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchPortfolio()
  }, [fetchPortfolio])

  // Auto-refresh every 30 seconds (optional)
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchPortfolio()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, fetchPortfolio])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    await fetchPortfolio()
  }, [fetchPortfolio])

  return {
    portfolio,
    isLoading,
    error,
    refetch
  }
}
