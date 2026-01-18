"use client"

/**
 * Trading Dashboard
 * Operation Phoenix | Trading Forge
 * For Madison
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import PortfolioCard from '@/components/PortfolioCard'
import TradeForm from '@/components/TradeForm'
import { usePortfolio } from '@/hooks/usePortfolio'
import { usePriceStream } from '@/hooks/usePriceStream'

export default function Dashboard() {
  const router = useRouter()
  const { portfolio, isLoading, error, refetch } = usePortfolio()
  const { prices, isConnected } = usePriceStream()

  const [username, setUsername] = useState<string>('')

  // Check authentication on mount
  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push('/login')
    }
  }, [router])

  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await apiClient.get('/auth/me')
        setUsername(response.data.username || response.data.email)
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      }
    }

    fetchProfile()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading portfolio...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-400 mb-2">
              Error Loading Portfolio
            </h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={refetch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Trading Forge
              </h1>
              <p className="text-gray-400 text-sm">
                Welcome back, {username}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* WebSocket Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-400">
                  {isConnected ? 'Live' : 'Disconnected'}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => apiClient.logout()}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Portfolio Summary - Full Width on Mobile, 2/3 on Desktop */}
          <div className="lg:col-span-3">
            <PortfolioCard 
              portfolio={portfolio} 
              prices={prices}
              onRefresh={refetch}
            />
          </div>

          {/* Holdings Table - 2/3 width on desktop */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  Holdings
                </h2>
                <span className="text-sm text-gray-400">
                  {portfolio?.holdings_count || 0} assets
                </span>
              </div>

              {/* Holdings Table */}
              {portfolio && portfolio.holdings && portfolio.holdings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                        <th className="pb-3 font-medium">Asset</th>
                        <th className="pb-3 font-medium text-right">Quantity</th>
                        <th className="pb-3 font-medium text-right">Avg Price</th>
                        <th className="pb-3 font-medium text-right">Current</th>
                        <th className="pb-3 font-medium text-right">Value</th>
                        <th className="pb-3 font-medium text-right">P&L</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {portfolio.holdings.map((holding) => {
                        const currentPrice = prices[holding.symbol] || holding.current_price
                        const isProfit = holding.unrealized_pnl >= 0

                        return (
                          <tr 
                            key={holding.symbol} 
                            className="border-b border-gray-700/50 hover:bg-gray-700/30 transition"
                          >
                            <td className="py-4 font-medium text-white">
                              {holding.symbol}
                            </td>
                            <td className="py-4 text-right text-gray-300">
                              {holding.quantity.toFixed(8)}
                            </td>
                            <td className="py-4 text-right text-gray-300">
                              ${holding.average_price.toLocaleString()}
                            </td>
                            <td className="py-4 text-right text-gray-300">
                              ${currentPrice.toLocaleString()}
                            </td>
                            <td className="py-4 text-right text-white font-medium">
                              ${holding.current_value.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </td>
                            <td className={`py-4 text-right font-medium ${
                              isProfit ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {isProfit ? '+' : ''}${holding.unrealized_pnl.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                              <span className="text-xs ml-1">
                                ({isProfit ? '+' : ''}{holding.pnl_percent.toFixed(2)}%)
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg 
                    className="w-16 h-16 mx-auto text-gray-600 mb-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
                    />
                  </svg>
                  <p className="text-gray-400 mb-2">No holdings yet</p>
                  <p className="text-sm text-gray-500">
                    Execute your first trade to get started
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Trade Form - 1/3 width on desktop */}
          <div className="lg:col-span-1">
            <TradeForm 
              prices={prices}
              onTradeExecuted={refetch}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
