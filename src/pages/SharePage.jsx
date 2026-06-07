import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SharePage() {
  const { id } = useParams()
  const [fish, setFish] = useState(null)
  const [loading, setLoading] = useState(true)
  const [photoIdx, setPhotoIdx] = useState(0)

  useEffect(() => {
    supabase.from('fishes').select('*').eq('id', id).single().then(({ data }) => {
      setFish(data)
      setLoading(false)
    })
  }, [id])

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-abyss)', zIndex: 1, position: 'relative' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--accent-biolum)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!fish) return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 12 }}>
      <span style={{ fontSize: 48 }}>🌊</span>
      <span>找不到這筆資料</span>
    </div>
  )

  const rows = [
    fish.scientific_name && { label: '學名', value: fish.scientific_name, italic: true },
    fish.flavor && { label: '味道', value: fish.flavor },
    fish.texture && { label: '肉質', value: fish.texture },
    fish.market_price && { label: '市場價格', value: `${fish.market_price} 元/斤` },
    fish.cooking_methods && { label: '料理方式', value: fish.cooking_methods },
    fish.aging_days && { label: '熟成建議', value: `${fish.aging_days} 天` },
    fish.sashimi_grade != null && { label: '生魚片', value: fish.sashimi_grade ? '✓ 適合' : '✗ 不建議' },
    fish.habitat_depth && { label: '棲息深度', value: `${fish.habitat_depth} m` },
    fish.description && { label: '備註', value: fish.description },
  ].filter(Boolean)

  return (
    <div style={{ height: '100%', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
      {/* Branding badge */}
      <div style={{
        position: 'fixed', top: 'calc(var(--safe-top) + 10px)', right: 12,
        zIndex: 20,
        padding: '4px 10px',
        background: 'rgba(2, 13, 24, 0.9)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 20,
        fontSize: 10,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
      }}>
        海鮮圖鑑
      </div>

      {/* Photo */}
      {fish.photos?.length > 0 && (
        <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--bg-surface)' }}>
          <img src={fish.photos[photoIdx]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {fish.photos.length > 1 && (
            <div style={{
              position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: 5,
            }}>
              {fish.photos.map((_, i) => (
                <div key={i} onClick={() => setPhotoIdx(i)} style={{
                  width: i === photoIdx ? 16 : 6, height: 6, borderRadius: 3,
                  background: i === photoIdx ? 'var(--accent-biolum)' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.3s', cursor: 'pointer',
                }} />
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ padding: '24px 20px 60px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
          {fish.name}
        </h1>
        {fish.scientific_name && (
          <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
            {fish.scientific_name}
          </p>
        )}

        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          {rows.map((row, i) => (
            <div key={row.label} style={{
              padding: '13px 16px',
              borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {row.label}
              </span>
              <span style={{
                fontSize: 14, color: 'var(--text-primary)', textAlign: 'right',
                fontStyle: row.italic ? 'italic' : 'normal', lineHeight: 1.5,
              }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          由海鮮圖鑑分享
        </p>
      </div>
    </div>
  )
}
