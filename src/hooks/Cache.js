import { useState, useEffect, useRef, useCallback } from 'react'
import audioCacheService from '../services/Audio'

export function useAudioCache() {
  const [cacheStats, setCacheStats] = useState({
    cacheSize: 0,
    maxCacheSize: 50,
    preloadQueueLength: 0,
    isPreloading: false
  })
  
  const [isEnabled, setIsEnabled] = useState(() => {
    return localStorage.getItem('audioCache.enabled') !== 'false'
  })
  
  const preloadTimeoutRef = useRef(null)
  const lastPreloadIndexRef = useRef(-1)

  const updateCacheStats = useCallback(() => {
    setCacheStats(audioCacheService.getCacheStats())
  }, [])

  const toggleCache = useCallback((enabled) => {
    setIsEnabled(enabled)
    localStorage.setItem('audioCache.enabled', enabled.toString())
    
    if (!enabled) {
      audioCacheService.clearCache()
    }
  }, [])

  const setMaxCacheSize = useCallback((size) => {
    audioCacheService.setMaxCacheSize(size)
    updateCacheStats()
  }, [updateCacheStats])

  const clearCache = useCallback(() => {
    audioCacheService.clearCache()
    updateCacheStats()
  }, [updateCacheStats])

  const preloadAudio = useCallback(async (track, priority = 'normal') => {
    if (!isEnabled || !track) return null
    
    try {
      return await audioCacheService.preloadAudio(track, priority)
    } catch (error) {
      console.warn('预加载失败:', error)
      return null
    }
  }, [isEnabled])

  const getCachedAudio = useCallback((track) => {
    if (!isEnabled || !track) return null
    
    return audioCacheService.getCachedAudio(track)
  }, [isEnabled])

  const preloadNext = useCallback(async (tracks, currentIndex) => {
    if (!isEnabled || !tracks || !Array.isArray(tracks)) return
    
    try {
      await audioCacheService.preloadNext(tracks, currentIndex)
      updateCacheStats()
    } catch (error) {
      console.warn('预加载下一首失败:', error)
    }
  }, [isEnabled, updateCacheStats])

  const preloadPrev = useCallback(async (tracks, currentIndex) => {
    if (!isEnabled || !tracks || !Array.isArray(tracks)) return
    
    try {
      await audioCacheService.preloadPrev(tracks, currentIndex)
      updateCacheStats()
    } catch (error) {
      console.warn('预加载上一首失败:', error)
    }
  }, [isEnabled, updateCacheStats])

  const preloadBatch = useCallback(async (tracks, startIndex, count = 3) => {
    if (!isEnabled || !tracks || !Array.isArray(tracks)) return
    
    try {
      await audioCacheService.preloadBatch(tracks, startIndex, count)
      updateCacheStats()
    } catch (error) {
      console.warn('批量预加载失败:', error)
    }
  }, [isEnabled, updateCacheStats])

  const smartPreload = useCallback(async (tracks, currentIndex) => {
    if (!isEnabled || !tracks || !Array.isArray(tracks)) return
    
    if (lastPreloadIndexRef.current === currentIndex) return
    lastPreloadIndexRef.current = currentIndex
    
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current)
    }
    
    preloadTimeoutRef.current = setTimeout(async () => {
      try {
        await Promise.all([
          audioCacheService.preloadNext(tracks, currentIndex),
          audioCacheService.preloadPrev(tracks, currentIndex)
        ])
        
        await audioCacheService.preloadBatch(tracks, currentIndex, 3)
        
        updateCacheStats()
      } catch (error) {
        console.warn('智能预加载失败:', error)
      }
    }, 1000)
  }, [isEnabled, updateCacheStats])

  useEffect(() => {
    const interval = setInterval(updateCacheStats, 1000)
    return () => clearInterval(interval)
  }, [updateCacheStats])

  useEffect(() => {
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current)
      }
    }
  }, [])

  return {
    cacheStats,
    isEnabled,
    
    toggleCache,
    setMaxCacheSize,
    clearCache,
    preloadAudio,
    getCachedAudio,
    preloadNext,
    preloadPrev,
    preloadBatch,
    smartPreload,
    updateCacheStats
  }
}

export function useAudioCacheConfig() {
  const [config, setConfig] = useState(() => {
    const defaultConfig = {
      enabled: true,
      maxCacheSize: 50,
      preloadCount: 3,
      preloadDelay: 1000,
      autoCleanup: true,
      cleanupInterval: 86400000
    }
    
    try {
      const saved = localStorage.getItem('audioCache.config')
      return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig
    } catch {
      return defaultConfig
    }
  })

  const updateConfig = useCallback((newConfig) => {
    const updatedConfig = { ...config, ...newConfig }
    setConfig(updatedConfig)
    localStorage.setItem('audioCache.config', JSON.stringify(updatedConfig))
  }, [config])

  return {
    config,
    updateConfig
  }
}
