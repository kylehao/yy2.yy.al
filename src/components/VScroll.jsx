import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useVScroll, useVScrollMetrics } from '../hooks/VScroll'

const VScroll = React.forwardRef(function VScroll({
  items = [],
  itemHeight = 60,
  containerHeight = 400,
  overscan = 5,
  onScroll,
  children,
  className = '',
  style = {},
  enableSmoothScrolling = true,
  scrollBehavior = 'smooth',
  enableMetrics = false
}, ref) {
  const {
    containerRef,
    scrollTop,
    containerHeightState,
    visibleRange,
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    scrollToIndex,
    scrollToItem,
    isScrolling
  } = useVScroll({
    items,
    itemHeight,
    containerHeight,
    overscan,
    enableSmoothScrolling,
    scrollBehavior
  })

  const { updateMetrics, getMetrics } = useVScrollMetrics()

  const enhancedHandleScroll = useCallback((e) => {
    handleScroll(e)
    updateMetrics('scroll')
    onScroll?.(e.target.scrollTop)
  }, [handleScroll, updateMetrics, onScroll])

  useEffect(() => {
    if (enableMetrics) {
      updateMetrics('render')
    }
  }, [visibleItems, enableMetrics, updateMetrics])

  React.useImperativeHandle(ref, () => ({
    scrollToIndex,
    scrollToItem,
    scrollTop: containerRef.current?.scrollTop || 0,
    getMetrics: enableMetrics ? getMetrics : undefined
  }), [scrollToIndex, scrollToItem, enableMetrics, getMetrics])

  return (
    <div
      ref={containerRef}
      className={`virtual-scroll-container ${className}`}
      style={{
        height: containerHeight,
        minHeight: '200px',
        contain: 'layout style',
        ...style
      }}
      onScroll={enhancedHandleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
          width: '100%'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0,
            height: visibleItems.length * itemHeight
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={item.key || item.id || item.originalIndex}
              style={{
                height: itemHeight,
                position: 'absolute',
                top: index * itemHeight,
                left: 0,
                right: 0
              }}
            >
              {children?.({ item, index: item.originalIndex, isVisible: true })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

export function withVScroll(WrappedComponent, options = {}) {
  return React.forwardRef((props, ref) => {
    const virtualScrollRef = useRef(null)
    
    React.useImperativeHandle(ref, () => ({
      scrollToIndex: (index) => virtualScrollRef.current?.scrollToIndex(index),
      scrollToItem: (item) => virtualScrollRef.current?.scrollToItem(item),
      scrollTop: virtualScrollRef.current?.scrollTop || 0
    }))

    return (
      <VScroll
        ref={virtualScrollRef}
        {...options}
        {...props}
      >
        {({ item, index, isVisible }) => (
          <WrappedComponent
            {...props}
            item={item}
            index={index}
            isVisible={isVisible}
          />
        )}
      </VScroll>
    )
  })
}

export default VScroll
