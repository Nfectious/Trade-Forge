/**
 * API Client Library
 * Operation Phoenix | Trading Forge
 * For Madison
 * 
 * Centralized HTTP client with authentication, error handling, and retry logic.
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'

// API base URL - from environment or default to localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Main API client with authentication and interceptors
 */
class APIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30 seconds
      withCredentials: true, // send httpOnly cookies on every request
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken()
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

        // Token expired - try to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const newToken = await this.refreshAccessToken()
            
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
              return this.client(originalRequest)
            }
          } catch (refreshError) {
            // Refresh failed - redirect to login
            this.handleAuthFailure()
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * Get access token from localStorage
   */
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('access_token')
  }

  /**
   * Refresh access token using httpOnly cookie.
   * The refresh_token cookie is sent automatically by the browser.
   */
  private async refreshAccessToken(): Promise<string | null> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      )

      const newAccessToken = response.data.access_token

      if (newAccessToken) {
        localStorage.setItem('access_token', newAccessToken)
        return newAccessToken
      }

      return null
    } catch (error) {
      console.error('Token refresh failed:', error)
      this.handleAuthFailure()
      return null
    }
  }

  /**
   * Handle authentication failure
   */
  private handleAuthFailure(): void {
    if (typeof window === 'undefined') return

    localStorage.removeItem('access_token')
    // refresh_token is in httpOnly cookie, cleared server-side on logout
    
    // Redirect to login if not already there
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.getAccessToken()
  }

  /**
   * Logout user
   */
  public logout(): void {
    localStorage.removeItem('access_token')
    // refresh_token is in httpOnly cookie, cleared server-side on logout
    window.location.href = '/login'
  }

  /**
   * GET request
   */
  public async get<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(url, config)
  }

  /**
   * POST request
   */
  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.post<T>(url, data, config)
  }

  /**
   * PUT request
   */
  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.put<T>(url, data, config)
  }

  /**
   * PATCH request
   */
  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.patch<T>(url, data, config)
  }

  /**
   * DELETE request
   */
  public async delete<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.client.delete<T>(url, config)
  }
}

// Export singleton instance
export const apiClient = new APIClient()

// Alias used by auth.tsx
export const api = apiClient

// Default export for convenience
export default api

/**
 * API response types
 */

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: {
    id: string
    email: string
    username: string
  }
}

export interface RegisterResponse {
  id: string
  email: string
  username: string
  created_at: string
}

export interface PortfolioResponse {
  user_id: string
  total_value: number
  cash_balance: number
  holdings_value: number
  total_invested: number
  starting_balance: number
  total_pnl: number
  pnl_percent: number
  holdings_count: number
  holdings: Holding[]
  updated_at: string
}

export interface Holding {
  symbol: string
  quantity: number
  average_price: number
  current_price: number
  total_invested: number
  current_value: number
  unrealized_pnl: number
  pnl_percent: number
  allocation_percent?: number
}

export interface TradeRequest {
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  order_type: string
}

export interface TradeResponse {
  trade_id: string
  symbol: string
  side: string
  quantity: number
  price: number
  total_value: number
  new_balance: number
  executed_at: string
  status: string
}

export interface PriceUpdate {
  symbol: string
  price: number
  exchange: string
  timestamp: string
}

/**
 * Utility functions
 */

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always'
  }).format(value / 100)
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}
