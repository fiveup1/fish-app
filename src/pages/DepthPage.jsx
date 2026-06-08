import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { proxyImage } from '../lib/imageProxy'

const DEPTH_ZONES = [
  { name: '潮間帶',  range: [0,    50],    color: '#a8c0e8' },
  { name: '淺海帶',  range: [50,   200],   color: '#6899d8' },
  { name: '中深海帶', range: [200,  1000],  color: '#4a72c4' },
  { name: '深海帶',  range: [1000, 4000],  color: '#2a4a9a' },
  { name: '深淵帶',  range: [4000, 11000], color: '#1a2e70' },
]
const CONTAINER_H = 1100

function getDepthY(depth, h) {
  const logDepth = Math.log10(Math.max(depth, 1))
  const logMax   = Math.log10(11000)
  return (logDepth / logMax) * h
}

export default function DepthPage() {
  const navigate = useNavigate()
  const [fishes, setFishes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    supabase
      .from('fishes')
      .select('id, name, scientific_name, habitat_depth, category, cover_photo, photos')
      .not('habitat_depth', 'is', null)
      .order('habitat_depth', { ascending: true })
      .then(({ data }) => { setFishes(data || []); setLoading(false) })
  }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div style={{
        paddingTop: 'calc(var(--safe-top) + 6px)',
        padding: 'calc(var(--safe-top) + 6px) 16px 14px',
        background: 'var(--grad-header)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 2 }}>
          海洋深度圖
        </h2>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {fishes.length} 種魚的棲息深度分佈
        </p>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--accent-sky)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
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
              width: 52, flexShrink: 0,
              position: 'relative',
              height: CONTAINER_H + 80,
              background: 'rgba(8,20,46,0.6)',
              borderRight: '1px solid var(--border-subtle)',
            }}>
              {[0, 50, 200, 1000, 4000, 11000].map(depth => {
                const y = getDepthY(depth, CONTAINER_H) + 40
                return (
                  <div key={depth} style={{
                    position: 'absolute', top: y, right: 6,
                    transform: 'translateY(-50%)',
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap',
                  }}>
                    {depth >= 1000 ? `${depth/1000}km` : `${depth}m`}
                  </div>
                )
              })}
            </div>

            {/* Ocean column */}
            <div style={{ flex: 1, position: 'relative', height: CONTAINER_H + 80 }}>
              {/* Zone gradients */}
              {DEPTH_ZONES.map(zone => {
                const y1 = getDepthY(zone.range[0], CONTAINER_H) + 40
                const y2 = getDepthY(zone.range[1], CONTAINER_H) + 40
                return (
                  <div key={zone.name} style={{
                    position: 'absolute', left: 0, right: 0, top: y1, height: y2 - y1,
                    background: `linear-gradient(180deg, ${zone.color}18, ${zone.color}08)`,
                    borderBottom: `1px solid ${zone.color}25`,
                  }}>
                    <span style={{
                      position: 'absolute', right: 8, top: 4,
                      fontSize: 9, color: zone.color, opacity: 0.65,
                      fontFamily: 'var(--font-mono)',
                    }}>{zone.name}</span>
                  </div>
                )
              })}

              {/* Surface line */}
              <div style={{
                position: 'absolute', top: 40, left: 0, right: 0, height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(168,192,232,0.4), transparent)',
              }} />

              {/* Fish entries */}
              {fishes.map((fish, i) => {
                const y = getDepthY(fish.habitat_depth, CONTAINER_H) + 40
                const isSelected = selected?.id === fish.id
                const cover = proxyImage(fish.cover_photo) || (fish.photos?.[0] ? fish.photos[0] : null)

                return (
                  <div
                    key={fish.id}
                    onClick={() => setSelected(isSelected ? null : fish)}
                    style={{
                      position: 'absolute',
                      top: y,
                      left: 8 + (i % 3) * 22,
                      transform: 'translateY(-50%)',
                      zIndex: isSelected ? 10 : 1,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {/* Fish avatar or dot */}
                    {cover ? (
                      <div style={{
                        width: isSelected ? 36 : 26,
                        height: isSelected ? 36 : 26,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: `2px solid ${isSelected ? 'var(--accent-sky)' : 'rgba(168,192,232,0.35)'}`,
                        boxShadow: isSelected ? '0 0 10px rgba(168,192,232,0.5)' : 'none',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                      }}>
                        <img src={cover} alt={fish.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{
                        width: isSelected ? 14 : 9,
                        height: isSelected ? 14 : 9,
                        borderRadius: '50%',
                        background: isSelected ? 'var(--accent-sky)' : 'rgba(168,192,232,0.5)',
                        border: `1px solid ${isSelected ? 'var(--accent-light)' : 'rgba(168,192,232,0.3)'}`,
                        boxShadow: isSelected ? '0 0 10px rgba(168,192,232,0.6)' : 'none',
                        transition: 'all 0.2s', flexShrink: 0,
                      }} />
                    )}

                    {/* Name label */}
                    {isSelected && (
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: 12,
                        color: 'var(--text-primary)',
                        background: 'rgba(8,20,46,0.88)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid var(--border-mid)',
                        borderRadius: 6, padding: '2px 7px',
                        whiteSpace: 'nowrap',
                        animation: 'bubbleUp 0.18s var(--ease-ocean)',
                        boxShadow: '0 2px 12px rgba(8,20,46,0.5)',
                      }}>{fish.name}</span>
                    )}
                  </div>
                )
              })}

              {/* Selected detail card */}
              {selected && (() => {
                const y = getDepthY(selected.habitat_depth, CONTAINER_H) + 40
                const cardTop = Math.min(y + 10, CONTAINER_H - 100)
                return (
                  <div
                    onClick={() => navigate(`/fish/${selected.id}`)}
                    style={{
                      position: 'absolute', top: cardTop, left: 60, right: 12,
                      zIndex: 20, cursor: 'pointer',
                      background: 'rgba(13,29,69,0.96)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid var(--border-active)',
                      borderRadius: 12, padding: '12px 14px',
                      boxShadow: '0 4px 24px rgba(8,20,46,0.6)',
                      animation: 'bubbleUp 0.2s var(--ease-ocean)',
                      maxWidth: 240,
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {selected.name}
                    </div>
                    {selected.scientific_name && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 5 }}>
                        {selected.scientific_name}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--accent-sky)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                      ▼ {selected.habitat_depth} m
                    </div>
                    {selected.category && (
                      <div style={{
                        display: 'inline-block',
                        fontSize: 9, color: 'var(--text-muted)',
                        background: 'var(--border-subtle)', borderRadius: 4,
                        padding: '2px 6px', fontFamily: 'var(--font-mono)',
                      }}>{selected.category}</div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--accent-sky)', opacity: 0.6, marginTop: 6, textAlign: 'right' }}>
                      點擊查看詳情 →
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
