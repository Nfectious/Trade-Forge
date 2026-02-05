/**
 * usePriceStream Hook
 * Operation Phoenix | Trading Forge
 * For Madison
 * 
 * Custom hook for WebSocket price stream integration
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface PriceUpdate {
  symbol: string
  price: number
  exchange: string
  timestamp: string
}

interface UsePriceStreamReturn {
  prices: Record<string, number>
  isConnected: boolean
  error: string | null
  reconnect: () => void
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/market/ws/prices'
const RECONNECT_DELAY = 3000 // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 10

export function usePriceStream(): UsePriceStreamReturn {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef<number>(0)

  const connect = useCallback(() => {
    try {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close()
      }

      // Create new WebSocket connection
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const update: PriceUpdate = JSON.parse(event.data)
          
          setPrices((prevPrices) => ({
            ...prevPrices,
            [update.symbol]: update.price
          }))
        } catch (err) {
          console.error('Failed to parse price update:', err)
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        setError('WebSocket connection error')
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setIsConnected(false)
        wsRef.current = null

        // Auto-reconnect if not closed intentionally
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++
          
          console.log(`Reconnecting... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, RECONNECT_DELAY)
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError('Failed to reconnect after multiple attempts')
        }
      }

    } catch (err) {
      console.error('Failed to create WebSocket:', err)
      setError('Failed to connect to price stream')
    }
  }, [])

  // Connect on mount
  useEffect(() => {
    connect()

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted')
      }
    }
  }, [connect])

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  return {
    prices,
    isConnected,
    error,
    reconnect
  }
}
