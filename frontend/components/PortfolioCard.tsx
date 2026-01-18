"use client"

/**
 * Portfolio Card Component
 * Operation Phoenix | Trading Forge
 * For Madison
 * 
 * Displays portfolio summary with real-time value and P&L
 */

import { PortfolioResponse } from '@/lib/api'

interface PortfolioCardProps {
  portfolio: PortfolioResponse | null
  prices: Record<string, number>
  onRefresh: () => void
}

export default function PortfolioCard({ portfolio, prices, onRefresh }: PortfolioCardProps) {
  if (!portfolio) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6">
        <div className="text-center py-8">
          <p className="text-gray-400">No portfolio data available</p>
        </div>
      </div>
    )
  }

  const isProfit = portfolio.total_pnl >= 0

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">
          Portfolio Overview
        </h2>
        
        <button
          onClick={onRefresh}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition flex items-center space-x-2"
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Value */}
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <p className="text-sm text-gray-400 mb-1">Total Value</p>
          <p className="text-3xl font-bold text-white">
            ${portfolio.total_value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Starting: ${portfolio.starting_balance.toLocaleString()}
          </p>
        </div>

        {/* Cash Balance */}
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <p className="text-sm text-gray-400 mb-1">Cash Balance</p>
          <p className="text-2xl font-bold text-white">
            ${portfolio.cash_balance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Available to trade
          </p>
        </div>

        {/* Holdings Value */}
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <p className="text-sm text-gray-400 mb-1">Holdings Value</p>
          <p className="text-2xl font-bold text-white">
            ${portfolio.holdings_value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Invested: ${portfolio.total_invested.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>

        {/* Total P&L */}
        <div className={`rounded-lg p-4 border-2 ${
          isProfit 
            ? 'bg-green-900/20 border-green-500' 
            : 'bg-red-900/20 border-red-500'
        }`}>
          <p className="text-sm text-gray-300 mb-1">Total P&L</p>
          <p className={`text-3xl font-bold ${
            isProfit ? 'text-green-400' : 'text-red-400'
          }`}>
            {isProfit ? '+' : ''}${portfolio.total_pnl.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
          <p className={`text-sm font-medium mt-1 ${
            isProfit ? 'text-green-300' : 'text-red-300'
          }`}>
            {isProfit ? '+' : ''}{portfolio.pnl_percent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Performance Bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Performance</span>
          <span className={`text-sm font-medium ${
            isProfit ? 'text-green-400' : 'text-red-400'
          }`}>
            {isProfit ? '+' : ''}{portfolio.pnl_percent.toFixed(2)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              isProfit ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ 
              width: `${Math.min(Math.abs(portfolio.pnl_percent), 100)}%` 
            }}
          ></div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-gray-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {portfolio.holdings_count}
          </p>
          <p className="text-sm text-gray-400 mt-1">Assets Held</p>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {((portfolio.holdings_value / portfolio.total_value) * 100).toFixed(1)}%
          </p>
          <p className="text-sm text-gray-400 mt-1">Deployed</p>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {((portfolio.cash_balance / portfolio.total_value) * 100).toFixed(1)}%
          </p>
          <p className="text-sm text-gray-400 mt-1">Cash</p>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          Last updated: {new Date(portfolio.updated_at).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
