import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { proxyImage } from '../lib/imageProxy'

const INFO_ROWS = [
  { key: 'scientific_name', label: '學名', icon: '🔬', italic: true },
  { key: 'common_names', label: '常見別名', icon: '🏷' },
  { key: 'category', label: '分類', icon: '📂' },
  { key: 'flavor', label: '味道', icon: '👅' },
  { key: 'texture', label: '肉質', icon: '✋' },
  { key: 'market_price', label: '市場價格', icon: '💰', suffix: ' 元/斤' },
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
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [settingCover, setSettingCover] = useState(null) // index being set

  useEffect(() => { fetchFish() }, [id])

  async function fetchFish() {
    const { data, error } = await supabase.from('fishes').select('*').eq('id', id).single()
    if (error) { navigate('/'); return }
    setFish(data)
    setLoading(false)
  }

  async function handleSetCover(photoUrl) {
    setSettingCover(photoUrl)
    await supabase.from('fishes').update({ cover_photo: photoUrl }).eq('id', id)
    setFish(f => ({ ...f, cover_photo: photoUrl }))
    setSettingCover(null)
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
        const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
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

  async function handleDelete() {
    setDeleting(true)
    try {
      if (fish.photos?.length > 0) {
        const paths = fish.photos
          .filter(url => url.includes('supabase.co'))
          .map(url => url.split('/fish-photos/')[1])
          .filter(Boolean)
        if (paths.length > 0) await supabase.storage.from('fish-photos').remove(paths)
      }
      await supabase.from('fishes').delete().eq('id', id)
      navigate('/')
    } catch (e) {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(`${window.location.origin}/share/${id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, position: 'relative' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--accent-biolum)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const coverPhoto = fish.cover_photo

  return (
    <div style={{ height: '100%', overflowY: 'auto', position: 'relative', zIndex: 1 }}>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(1,8,16,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid rgba(255,107,107,0.3)',
            borderRadius: 16, padding: 24, maxWidth: 320, width: '100%',
            animation: 'bubbleUp 0.2s var(--ease-ocean)',
          }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🗑</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, textAlign: 'center', marginBottom: 8 }}>確定要刪除？</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
              「{fish.name}」的所有資料與照片將永久刪除，無法復原。
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{
                flex: 1, padding: '12px', borderRadius: 10,
                background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                fontSize: 14, fontWeight: 600,
              }}>取消</button>
              <button onClick={handleDelete} disabled={deleting} style={{
                flex: 1, padding: '12px', borderRadius: 10,
                background: 'rgba(255,107,107,0.2)', border: '1px solid rgba(255,107,107,0.4)',
                color: 'var(--accent-coral)', fontSize: 14, fontWeight: 600,
              }}>{deleting ? '刪除中...' : '確定刪除'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Top buttons */}
      <button onClick={() => navigate(-1)} style={{
        position: 'fixed', top: 'calc(var(--safe-top) + 12px)', left: 16, zIndex: 20,
        width: 36, height: 36, borderRadius: '50%',
        background: 'rgba(2,13,24,0.8)', backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-subtle)', color: 'var(--text-primary)',
        fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>←</button>

      <div style={{ position: 'fixed', top: 'calc(var(--safe-top) + 12px)', right: 16, zIndex: 20, display: 'flex', gap: 8 }}>
        <button onClick={handleShare} style={{
          padding: '8px 14px', borderRadius: 20,
          background: copied ? 'rgba(78,205,196,0.2)' : 'rgba(2,13,24,0.8)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${copied ? 'var(--accent-kelp)' : 'var(--border-subtle)'}`,
          color: copied ? 'var(--accent-kelp)' : 'var(--text-secondary)',
          fontSize: 12, transition: 'all 0.3s',
        }}>{copied ? '✓ 已複製' : '分享'}</button>
        <button onClick={() => setShowDeleteConfirm(true)} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(2,13,24,0.8)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,107,107,0.3)',
          color: 'var(--accent-coral)', fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>🗑</button>
      </div>

      {/* Cover photo */}
      <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--bg-surface)' }}>
        {coverPhoto ? (
          <img src={proxyImage(coverPhoto)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, opacity: 0.2 }}>🐟</div>
        )}
        {coverPhoto && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.3)',
            borderRadius: 6, padding: '3px 8px', fontSize: 10, color: 'var(--accent-biolum)',
          }}>封面照</div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px 60px' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{fish.name}</h1>
          {fish.scientific_name && (
            <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 14 }}>{fish.scientific_name}</p>
          )}
        </div>

        {/* Info */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden', marginBottom: 24 }}>
          {INFO_ROWS.filter(row => row.key !== 'scientific_name' && fish[row.key] != null && fish[row.key] !== '').map((row, i, arr) => (
            <div key={row.key} style={{
              display: 'flex', alignItems: 'flex-start', padding: '12px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: 12,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{row.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>{row.label}</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5, fontStyle: row.italic ? 'italic' : 'normal' }}>
                  {`${fish[row.key]}${row.suffix || ''}`}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* My Photos Section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              我的照片 ({fish.photos?.length || 0}/10)
            </h3>
            {(fish.photos?.length || 0) < 10 && (
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                style={{ color: 'var(--accent-biolum)', fontSize: 12, background: 'none', fontFamily: 'var(--font-body)' }}>
                {uploading ? '上傳中...' : '+ 新增'}
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleAddPhotos} />

          {fish.photos?.length > 0 ? (
            <>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>長按任一張可設為圖鑑封面</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {fish.photos.map((url, i) => {
                  const isCover = fish.cover_photo === url
                  return (
                    <div
                      key={i}
                      style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
                        border: isCover ? '2px solid var(--accent-biolum)' : '2px solid transparent',
                        transition: 'border-color 0.2s',
                      }}
                      onContextMenu={e => { e.preventDefault(); handleSetCover(url) }}
                      onTouchStart={e => {
                        const t = setTimeout(() => handleSetCover(url), 600)
                        e.currentTarget._pressTimer = t
                      }}
                      onTouchEnd={e => clearTimeout(e.currentTarget._pressTimer)}
                    >
                      <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {isCover && (
                        <div style={{
                          position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                          background: 'rgba(0,229,255,0.9)', borderRadius: 4,
                          padding: '2px 6px', fontSize: 9, color: '#020d18', fontWeight: 700, whiteSpace: 'nowrap',
                        }}>✓ 封面</div>
                      )}
                      {settingCover === url && (
                        <div style={{
                          position: 'absolute', inset: 0, background: 'rgba(0,229,255,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent-biolum)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                        </div>
                      )}
                      {/* Set cover button overlay */}
                      {!isCover && (
                        <button
                          onClick={() => handleSetCover(url)}
                          style={{
                            position: 'absolute', bottom: 4, right: 4,
                            background: 'rgba(0,0,0,0.6)', borderRadius: 4,
                            padding: '3px 6px', fontSize: 9, color: 'rgba(255,255,255,0.8)',
                          }}
                        >設封面</button>
                      )}
                    </div>
                  )
                })}
                {fish.photos.length < 10 && (
                  <button onClick={() => fileInputRef.current?.click()} style={{
                    aspectRatio: '1', borderRadius: 10, background: 'var(--bg-card)',
                    border: '1px dashed var(--border-subtle)', color: 'var(--text-muted)', fontSize: 24,
                  }}>+</button>
                )}
              </div>
            </>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} style={{
              width: '100%', padding: '20px', borderRadius: 12,
              background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)',
              color: 'var(--text-muted)', fontSize: 13,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 28 }}>📷</span>
              <span>上傳自己拍的照片</span>
            </button>
          )}
        </div>

        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          {new Date(fish.created_at).toLocaleDateString('zh-TW')} 新增
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function navBtnStyle(side) {
  return {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    [side]: 8, width: 32, height: 32, borderRadius: '50%',
    background: 'rgba(2,13,24,0.7)', color: 'white',
    fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
