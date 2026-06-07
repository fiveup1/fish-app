import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { proxyImage } from '../lib/imageProxy'

const INFO_ROWS = [
  { key: 'scientific_name', label: '學名', icon: '🔬', italic: true },
  { key: 'category', label: '分類', icon: '🏷' },
  { key: 'flavor', label: '味道', icon: '👅' },
  { key: 'texture', label: '肉質', icon: '✋' },
  { key: 'market_price', label: '市場價格', icon: '💰', suffix: ' 元/斤' },
  { key: 'common_names', label: '常見別名', icon: '🏷' },
  { key: 'cooking_methods', label: '料理方式', icon: '🍳' },
  { key: 'habitat_depth', label: '棲息深度', icon: '🌊', suffix: ' m' },
  { key: 'description', label: '備註', icon: '📝' },
]

export default function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [fish, setFish] = useState(null)
  const [loading, setLoading] = useState(true)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchFish()
  }, [id])

  async function fetchFish() {
    const { data, error } = await supabase.from('fishes').select('*').eq('id', id).single()
    if (error) { console.error(error); navigate('/'); return }
    setFish(data)
    setLoading(false)
  }

  async function handleAddPhotos(e) {
    const files = Array.from(e.target.files)
    const remaining = 10 - (fish.photos?.length || 0)
    const toUpload = files.slice(0, remaining)
    if (!toUpload.length) return
    setUploading(true)
    try {
      const urls = []
      for (const file of toUpload) {
        const ext = file.name.split('.').pop()
        const path = `${id}/${Date.now()}.${ext}`
        await supabase.storage.from('fish-photos').upload(path, file)
        const { data } = supabase.storage.from('fish-photos').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
      const newPhotos = [...(fish.photos || []), ...urls]
      await supabase.from('fishes').update({ photos: newPhotos }).eq('id', id)
      setFish(f => ({ ...f, photos: newPhotos }))
    } finally {
      setUploading(false)
    }
  }

  function handleShare() {
    const url = `${window.location.origin}/share/${id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, position: 'relative' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--accent-biolum)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: 'fixed',
          top: 'calc(var(--safe-top) + 12px)',
          left: 16,
          zIndex: 20,
          width: 36, height: 36,
          borderRadius: '50%',
          background: 'rgba(2, 13, 24, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
          fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >←</button>

      {/* Share button */}
      <button
        onClick={handleShare}
        style={{
          position: 'fixed',
          top: 'calc(var(--safe-top) + 12px)',
          right: 16,
          zIndex: 20,
          padding: '8px 14px',
          borderRadius: 20,
          background: copied ? 'rgba(78, 205, 196, 0.2)' : 'rgba(2, 13, 24, 0.8)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${copied ? 'var(--accent-kelp)' : 'var(--border-subtle)'}`,
          color: copied ? 'var(--accent-kelp)' : 'var(--text-secondary)',
          fontSize: 12,
          transition: 'all 0.3s',
        }}
      >
        {copied ? '✓ 已複製' : '分享'}
      </button>

      {/* Photo Gallery */}
      <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--bg-surface)' }}>
        {fish.photos?.length > 0 ? (
          <>
            <img
              src={proxyImage(fish.photos[photoIdx])}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {fish.photos.length > 1 && (
              <>
                {/* Prev/Next */}
                {photoIdx > 0 && (
                  <button onClick={() => setPhotoIdx(i => i - 1)} style={navBtnStyle('left')}>‹</button>
                )}
                {photoIdx < fish.photos.length - 1 && (
                  <button onClick={() => setPhotoIdx(i => i + 1)} style={navBtnStyle('right')}>›</button>
                )}
                {/* Dots */}
                <div style={{
                  position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                  display: 'flex', gap: 5,
                }}>
                  {fish.photos.map((_, i) => (
                    <div key={i} onClick={() => setPhotoIdx(i)} style={{
                      width: i === photoIdx ? 16 : 6,
                      height: 6,
                      borderRadius: 3,
                      background: i === photoIdx ? 'var(--accent-biolum)' : 'rgba(255,255,255,0.4)',
                      transition: 'all 0.3s',
                      cursor: 'pointer',
                    }} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 60, opacity: 0.2,
          }}>🐟</div>
        )}

        {/* Add photo button */}
        {(fish.photos?.length || 0) < 10 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              position: 'absolute', bottom: 12, right: 12,
              padding: '6px 12px',
              borderRadius: 20,
              background: 'rgba(2, 13, 24, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: 11,
            }}
          >
            {uploading ? '上傳中...' : `+ 照片 (${fish.photos?.length || 0}/10)`}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleAddPhotos} />
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px 40px' }}>
        {/* Name */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 4,
          }}>
            {fish.name}
          </h1>
          {fish.scientific_name && (
            <p style={{
              fontStyle: 'italic',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}>
              {fish.scientific_name}
            </p>
          )}
        </div>

        {/* Info Grid */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          {INFO_ROWS.filter(row => row.key !== 'scientific_name' && fish[row.key] != null && fish[row.key] !== '').map((row, i) => (
            <div key={row.key} style={{
              display: 'flex',
              alignItems: 'flex-start',
              padding: '12px 16px',
              borderBottom: i < INFO_ROWS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              gap: 12,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{row.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>
                  {row.label}
                </div>
                <div style={{
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  lineHeight: 1.5,
                  fontStyle: row.italic ? 'italic' : 'normal',
                }}>
                  {row.boolean
                    ? (fish[row.key] ? '✓ 適合' : '✗ 不建議')
                    : `${fish[row.key]}${row.suffix || ''}`
                  }
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Created at */}
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          {new Date(fish.created_at).toLocaleDateString('zh-TW')} 新增
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function navBtnStyle(side) {
  return {
    position: 'absolute',
    top: '50%', transform: 'translateY(-50%)',
    [side]: 8,
    width: 32, height: 32,
    borderRadius: '50%',
    background: 'rgba(2, 13, 24, 0.7)',
    color: 'white',
    fontSize: 20,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
