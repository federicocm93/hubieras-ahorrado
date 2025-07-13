'use client'

import { useRef, useCallback } from 'react'

interface QueuedRequest<T> {
  id: string
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

interface UseRequestQueueReturn {
  enqueue: <T>(key: string, requestFn: () => Promise<T>) => Promise<T>
  clear: () => void
  isInQueue: (key: string) => boolean
}

/**
 * Request queue hook to prevent duplicate API calls
 * Following Next.js standards for performance optimization
 */
export function useRequestQueue(): UseRequestQueueReturn {
  const queue = useRef<Map<string, QueuedRequest<unknown>>>(new Map())

  const enqueue = useCallback(<T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
    // If request is already in queue, return the existing promise
    const existingRequest = queue.current.get(key)
    if (existingRequest) {
      console.log(`🔄 Request ${key} already in queue, returning existing promise`)
      return existingRequest.promise as Promise<T>
    }

    // Create new request
    let resolve: (value: T) => void
    let reject: (error: Error) => void
    
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })

    const queuedRequest: QueuedRequest<T> = {
      id: key,
      promise,
      resolve: resolve!,
      reject: reject!
    }

    queue.current.set(key, queuedRequest as QueuedRequest<unknown>)
    console.log(`➕ Added request ${key} to queue`)

    // Execute the request
    requestFn()
      .then((result) => {
        console.log(`✅ Request ${key} completed successfully`)
        queuedRequest.resolve(result)
      })
      .catch((error) => {
        console.error(`❌ Request ${key} failed:`, error)
        queuedRequest.reject(error instanceof Error ? error : new Error(String(error)))
      })
      .finally(() => {
        // Remove from queue when done
        queue.current.delete(key)
        console.log(`🗑️ Removed request ${key} from queue`)
      })

    return promise
  }, [])

  const clear = useCallback(() => {
    console.log('🧹 Clearing request queue')
    queue.current.clear()
  }, [])

  const isInQueue = useCallback((key: string) => {
    return queue.current.has(key)
  }, [])

  return {
    enqueue,
    clear,
    isInQueue
  }
}