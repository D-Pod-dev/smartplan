import React, { useLayoutEffect, useRef, useState } from 'react'

export default function FocusQueue({
  queue,
  currentQueueIndex,
  queueExpanded,
  queueLocked,
  queuePinned,
  onTogglePin,
  onClearQueue,
  queueHoverRef,
  onStartItem,
  onMoveItem,
  onRemoveItem,
  getTimeAllocationDisplay,
  formatTarget,
  timerState,
  taskCompletedMap,
  queueEditMode,
  onEnterEditMode,
  onSaveEdits,
  onDiscardEdits,
}) {
  const itemRefs = useRef({})
  const positionsRef = useRef({})
  const containerRef = useRef(null)
  const [hoveredItemId, setHoveredItemId] = useState(null)
  const [hoveredNumberId, setHoveredNumberId] = useState(null)

  // Capture positions before render
  const capturePositions = () => {
    const positions = {}
    Object.keys(itemRefs.current).forEach(id => {
      const el = itemRefs.current[id]
      if (el) {
        positions[id] = el.getBoundingClientRect()
      }
    })
    return positions
  }

  // Animate items when the queue order changes
  useLayoutEffect(() => {
    const prevPositions = positionsRef.current
    const container = containerRef.current
    
    // Get new positions after render
    const currentPositions = {}
    Object.keys(itemRefs.current).forEach(id => {
      const el = itemRefs.current[id]
      if (el) {
        currentPositions[id] = el.getBoundingClientRect()
      }
    })

    let isAnimating = false

    // Animate each item
    Object.keys(itemRefs.current).forEach(id => {
      const el = itemRefs.current[id]
      if (el && prevPositions[id] && currentPositions[id]) {
        const deltaY = prevPositions[id].top - currentPositions[id].top

        if (deltaY !== 0) {
          isAnimating = true
          
          // Temporarily prevent scrollbar flicker
          if (container) {
            container.style.overflowY = 'hidden'
          }
          
          // Set initial position (invert)
          el.style.transform = `translateY(${deltaY}px)`
          el.style.transition = 'none'
          
          // Force reflow
          el.offsetHeight

          // Animate to final position (play)
          requestAnimationFrame(() => {
            el.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            el.style.transform = 'translateY(0)'
            
            // Clean up after animation completes
            const cleanup = () => {
              el.style.transform = ''
              el.style.transition = ''
              el.removeEventListener('transitionend', cleanup)
              
              // Restore overflow after all animations complete
              if (container) {
                container.style.overflowY = ''
              }
            }
            el.addEventListener('transitionend', cleanup)
          })
        }
      }
    })

    // Save positions for next time
    positionsRef.current = currentPositions
  }, [queue])
  return (
    <aside
      className={`panel focus-queue focus-layout__queue ${!queueExpanded ? 'focus-queue--collapsed' : ''} ${queueLocked ? 'focus-queue--locked' : ''}`}
      ref={queueHoverRef}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <div className="panel__title">Queue ({queue.length})</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          {timerState === 'idle' && !queueEditMode && (
            <button
              className="action ghost"
              onClick={onClearQueue}
              disabled={queue.length === 0}
              title={queue.length === 0 ? 'No tasks to clear' : 'Clear all queued tasks'}
            >
              Clear Queue
            </button>
          )}
          {timerState === 'completed' && !queueEditMode && (
            <button
              className="action ghost"
              onClick={onEnterEditMode}
              disabled={queue.length === 0}
              title={queue.length === 0 ? 'No tasks to edit' : 'Edit queue order'}
            >
              Edit Queue
            </button>
          )}
          {queueEditMode && (
            <>
              <button
                className="action primary"
                onClick={onSaveEdits}
                style={{ fontSize: '0.9rem' }}
              >
                Save
              </button>
              <button
                className="action secondary"
                onClick={onDiscardEdits}
                style={{ fontSize: '0.9rem' }}
              >
                Cancel
              </button>
            </>
          )}
          {queueLocked && !queueEditMode && (
            <span className="pill pill--filled" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>
              Timer running
            </span>
          )}
          <button
            className="pill--utility"
            onClick={onTogglePin}
            title={queuePinned ? 'Unpin queue' : 'Pin queue'}
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              background: queuePinned ? 'var(--accent-soft)' : 'transparent',
              border: '1px solid ' + (queuePinned ? 'var(--accent)' : 'var(--sidebar-border)'),
              padding: '0.35rem 0.7rem',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 200ms'
            }}
          >
            📌
          </button>
        </div>
      </div>

      {queueExpanded && queue.length > 0 && (
        <div className="focus-queue__items" ref={containerRef}>
          {queue.map((task, index) => {
            const isCurrent = index === currentQueueIndex
            const isDone = (timerState !== 'idle' && index < currentQueueIndex) || taskCompletedMap?.[task.id]
            const shouldDim = timerState === 'running' || timerState === 'paused'
            return (
              <div
                key={task.id}
                ref={(el) => { itemRefs.current[task.id] = el }}
                className={`focus-queue__item ${isCurrent ? 'focus-queue__item--current' : ''} ${isDone ? 'focus-queue__item--done' : ''} ${shouldDim ? 'focus-queue__item--timer-active' : ''}`}
                onMouseEnter={() => {
                  if (timerState === 'idle' && !queueEditMode) {
                    setHoveredItemId(task.id)
                  }
                }}
                onMouseLeave={() => setHoveredItemId(null)}
              >
                <div
                  className="focus-queue__item-number"
                  style={{
                    ...(isCurrent && timerState !== 'idle'
                      ? {
                          background: '#7ba8f0',
                          color: '#0b0b0b',
                          boxShadow: '0 0 12px rgba(123, 168, 240, 0.4)',
                        }
                      : {}),
                    ...(hoveredNumberId === task.id && timerState === 'idle' && !queueEditMode
                      ? {
                          background: 'rgba(123, 168, 240, 0.3)',
                          borderColor: '#7ba8f0',
                          boxShadow: '0 0 8px rgba(123, 168, 240, 0.2)',
                        }
                      : {}),
                    cursor: timerState === 'idle' && !queueEditMode ? 'pointer' : 'default',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={() => setHoveredNumberId(task.id)}
                  onMouseLeave={() => setHoveredNumberId(null)}
                  onClick={() => {
                    if (timerState === 'idle' && !queueEditMode && onStartItem) {
                      onStartItem(index)
                    }
                  }}
                  title={timerState === 'idle' && !queueEditMode ? 'Start queue from here' : ''}
                >
                  {hoveredItemId === task.id && timerState === 'idle' && !queueEditMode ? '▶' : index + 1}
                </div>
                <div className="focus-queue__item-content" style={isDone ? { opacity: 0.65 } : undefined}>
                  <div className="focus-queue__item-title">{task.title}</div>
                  <div className="focus-queue__item-meta">
                    <span className="pill pill--filled">{getTimeAllocationDisplay(task)}</span>
                    {formatTarget(task.objective) && <span className="pill pill--filled">{formatTarget(task.objective)}</span>}
                  </div>
                </div>
                <div className="focus-queue__item-actions">
                  <button
                    className="focus-queue__icon-btn"
                    onClick={() => onMoveItem(index, -1)}
                    disabled={(!queueEditMode && timerState !== 'idle') || index === 0 || (timerState !== 'idle' && (index <= currentQueueIndex || index === currentQueueIndex + 1))}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="focus-queue__icon-btn"
                    onClick={() => onMoveItem(index, 1)}
                    disabled={(!queueEditMode && timerState !== 'idle') || index === queue.length - 1 || (timerState !== 'idle' && index <= currentQueueIndex)}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className="action ghost focus-queue__icon-btn"
                    onClick={() => onRemoveItem(index)}
                    disabled={(!queueEditMode && timerState !== 'idle') || (timerState !== 'idle' && index <= currentQueueIndex)}
                    title="Remove from queue"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {queueExpanded && queue.length === 0 && (
        <p className="focus-queue__empty">Queue is empty. Select tasks to add.</p>
      )}
    </aside>
  )
}
