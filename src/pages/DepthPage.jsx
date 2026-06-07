import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const DEPTH_ZONES = [
  { name: '潮間帶', range: [0, 50], color: '#00e5ff', opacity: 0.9 },
  { name: '淺海帶', range: [50, 200], color: '#00b4d8', opacity: 0.8 },
  { name: '中深海帶', range: [200, 1000], color: '#0077b6', opacity: 0.7 },
  { name: '深海帶', range: [1000, 4000], color: '#023e8a', opacity: 0.6 },
  { name: '深淵帶', range: [4000, 11000], color: '#03045e', opacity: 0.5 },
]

const MAX_DEPTH = 1200 // pixels we render

function getDepthY(depth, containerH) {
  // Log scale for better visualization
  const logDepth = Math.log10(Math.max(depth, 1))
  const logMax = Math.log10(11000)
  return (logDepth / logMax) * containerH
}

export default function DepthPage() {
  const [fishes, setFishes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    supabase
      .from('fishes')
      .select('id, name, scientific_name, habitat_depth, category, photos')
      .not('habitat_depth', 'is', null)
      .order('habitat_depth', { ascending: true })
      .then(({ data }) => {
        setFishes(data || [])
        setLoading(false)
      })
  }, [])

  const CONTAINER_H = MAX_DEPTH

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* Header */}
      <div style={{
        paddingTop: 'calc(var(--safe-top) + 8px)',
        padding: 'calc(var(--safe-top) + 8px) 16px 14px',
        background: 'rgba(2, 13, 24, 0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 2,
        }}>海洋深度圖</h2>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {fishes.length} 種魚的棲息深度分佈
        </p>
      </div>

      {/* Main scrollable area */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--accent-biolum)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : fishes.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)', gap: 8 }}>
            <span style={{ fontSize: 40 }}>🌊</span>
            <span style={{ fontSize: 14 }}>新增含有棲息深度資料的海鮮後顯示</span>
          </div>
        ) : (
          <div style={{ display: 'flex' }}>
            {/* Depth ruler */}
            <div style={{
              width: 56,
              flexShrink: 0,
              position: 'relative',
              height: CONTAINER_H + 80,
              background: 'rgba(2, 13, 24, 0.6)',
              borderRight: '1px solid var(--border-subtle)',
            }}>
              {[0, 50, 200, 1000, 4000, 11000].map(depth => {
                const y = getDepthY(depth, CONTAINER_H) + 40
                return (
                  <div key={depth} style={{
                    position: 'absolute',
                    top: y,
                    right: 8,
                    transform: 'translateY(-50%)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--text-muted)',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}>
                    {depth >= 1000 ? `${depth/1000}km` : `${depth}m`}
                  </div>
                )
              })}
            </div>

            {/* Ocean column */}
            <div ref={containerRef} style={{
              flex: 1,
              position: 'relative',
              height: CONTAINER_H + 80,
            }}>
              {/* Zone backgrounds */}
              {DEPTH_ZONES.map(zone => {
                const y1 = getDepthY(zone.range[0], CONTAINER_H) + 40
                const y2 = getDepthY(zone.range[1], CONTAINER_H) + 40
                return (
                  <div key={zone.name} style={{
                    position: 'absolute',
                    left: 0, right: 0,
                    top: y1,
                    height: y2 - y1,
                    background: `linear-gradient(180deg, ${zone.color}15, ${zone.color}08)`,
                    borderBottom: `1px solid ${zone.color}20`,
                  }}>
                    <span style={{
                      position: 'absolute',
                      right: 8,
                      top: 4,
                      fontSize: 9,
                      color: zone.color,
                      opacity: 0.6,
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {zone.name}
                    </span>
                  </div>
                )
              })}

              {/* Surface */}
              <div style={{
                position: 'absolute',
                top: 40, left: 0, right: 0,
                height: 2,
                background: 'linear-gradient(90deg, transparent, var(--accent-biolum), transparent)',
                opacity: 0.5,
              }} />

              {/* Fish dots */}
              {fishes.map((fish, i) => {
                const y = getDepthY(fish.habitat_depth, CONTAINER_H) + 40
                const col = (i % 5) * 18 + 8
                const isSelected = selected?.id === fish.id

                return (
                  <div
                    key={fish.id}
                    onClick={() => setSelected(isSelected ? null : fish)}
                    style={{
                      position: 'absolute',
                      top: y,
                      left: col,
                      transform: 'translate(0, -50%)',
                      zIndex: isSelected ? 10 : 1,
                      cursor: 'pointer',
                    }}
                  >
                    {/* Dot */}
                    <div style={{
                      width: isSelected ? 12 : 8,
                      height: isSelected ? 12 : 8,
                      borderRadius: '50%',
                      background: isSelected ? 'var(--accent-biolum)' : 'rgba(0, 229, 255, 0.5)',
                      border: isSelected ? '2px solid var(--accent-biolum)' : '1px solid rgba(0, 229, 255, 0.3)',
                      boxShadow: isSelected ? '0 0 12px var(--accent-biolum)' : 'none',
                      transition: 'all 0.2s',
                    }} />
                  </div>
                )
              })}

              {/* Selected info popup */}
              {selected && (() => {
                const y = getDepthY(selected.habitat_depth, CONTAINER_H) + 40
                return (
                  <div style={{
                    position: 'absolute',
                    top: Math.min(y - 10, CONTAINER_H - 80),
                    left: 24,
                    zIndex: 20,
                    background: 'rgba(4, 20, 40, 0.96)',
                    border: '1px solid var(--border-active)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                    animation: 'bubbleUp 0.2s var(--ease-ocean)',
                    maxWidth: 200,
                    pointerEvents: 'none',
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {selected.name}
                    </div>
                    {selected.scientific_name && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 4 }}>
                        {selected.scientific_name}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--accent-biolum)', fontFamily: 'var(--font-mono)' }}>
                      ▼ {selected.habitat_depth} m
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
