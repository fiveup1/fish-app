import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { proxyImage } from '../lib/imageProxy'

const INFO_ROWS = [
  { key: 'scientific_name', label: '學名',      icon: '🔬', italic: true },
  { key: 'common_names',    label: '常見別名',   icon: '🏷' },
  { key: 'category',        label: '分類',      icon: '📂' },
  { key: 'flavor',          label: '味道',      icon: '👅' },
  { key: 'texture',         label: '肉質',      icon: '✋' },
  { key: 'market_price',    label: '市場價格',   icon: '💰', suffix: ' 元/斤' },
  { key: 'cooking_methods', label: '料理方式',   icon: '🍳' },
  { key: 'habitat_depth',   label: '棲息深度',   icon: '🌊', suffix: ' m' },
  { key: 'description',     label: '備註',      icon: '📝' },
]

/* ── Lightbox ─────────────────────────────────────────── */
function Lightbox({ photos, initialIndex, onClose }) {
  const [idx, setIdx] = useState(initialIndex)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  const prev = useCallback(() => setIdx(i => (i - 1 + photos.length) % photos.length), [photos.length])
  const next = useCallback(() => setIdx(i => (i + 1) % photos.length), [photos.length])

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (Math.abs(dx) > 40 && dy < 60) {
      if (dx < 0) next(); else prev()
    }
    touchStartX.current = null
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(8,20,46,0.97)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 'calc(var(--safe-top) + 12px)', right: 16,
        width: 38, height: 38, borderRadius: '50%',
        background: 'rgba(168,192,232,0.12)',
        border: '1px solid var(--border-mid)',
        color: 'var(--text-primary)', fontSize: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>×</button>

      {/* Counter */}
      <div style={{
        position: 'absolute', top: 'calc(var(--safe-top) + 18px)', left: '50%', transform: 'translateX(-50%)',
        fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)',
      }}>{idx + 1} / {photos.length}</div>

      {/* Image */}
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0 64px' }}>
        <img
          key={idx}
          src={photos[idx]}
          alt=""
          style={{
            maxWidth: '100%', maxHeight: '100%',
            objectFit: 'contain',
            animation: 'bubbleUp 0.22s var(--ease-ocean)',
            borderRadius: 4,
          }}
        />
      </div>

      {/* Arrows (hidden on narrow, swipe instead) */}
      {photos.length > 1 && (
        <>
          <button onClick={prev} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(168,192,232,0.10)', border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>‹</button>
          <button onClick={next} style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(168,192,232,0.10)', border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>›</button>
        </>
      )}

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 'calc(var(--safe-bottom) + 16px)',
          display: 'flex', gap: 6, alignItems: 'center',
        }}>
          {photos.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{
              width: i === idx ? 18 : 6, height: 6, borderRadius: 3,
              background: i === idx ? 'var(--accent-sky)' : 'rgba(168,192,232,0.3)',
              transition: 'all 0.2s',
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── DetailPage ───────────────────────────────────────── */
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
  const [settingCover, setSettingCover] = useState(null)
  const [deletingPhoto, setDeletingPhoto] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(null) // null = closed

  useEffect(() => { fetchFish() }, [id]) // eslint-disable-line

  async function fetchFish() {
    const { data, error } = await supabase.from('fishes').select('*').eq('id', id).single()
    if (error) { navigate('/'); return }
    setFish(data); setLoading(false)
  }

  async function handleSetCover(photoUrl) {
    setSettingCover(photoUrl)
    await supabase.from('fishes').update({ cover_photo: photoUrl }).eq('id', id)
    setFish(f => ({ ...f, cover_photo: photoUrl }))
    setSettingCover(null)
  }

  async function handleDeletePhoto(photoUrl) {
    setDeletingPhoto(photoUrl)
    try {
      const newPhotos = (fish.photos || []).filter(u => u !== photoUrl)
      // Remove from storage if supabase url
      if (photoUrl.includes('supabase.co')) {
        const path = photoUrl.split('/fish-photos/')[1]
        if (path) await supabase.storage.from('fish-photos').remove([path])
      }
      const update = { photos: newPhotos }
      if (fish.cover_photo === photoUrl) update.cover_photo = null
      await supabase.from('fishes').update(update).eq('id', id)
      setFish(f => ({ ...f, photos: newPhotos, ...(f.cover_photo === photoUrl ? { cover_photo: null } : {}) }))
    } finally {
      setDeletingPhoto(null)
    }
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
    } finally { setUploading(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      if (fish.photos?.length > 0) {
        const paths = fish.photos.filter(u => u.includes('supabase.co')).map(u => u.split('/fish-photos/')[1]).filter(Boolean)
        if (paths.length > 0) await supabase.storage.from('fish-photos').remove(paths)
      }
      await supabase.from('fishes').delete().eq('id', id)
      navigate('/')
    } catch { setDeleting(false); setShowDeleteConfirm(false) }
  }

  function handleShare() {
    navigator.clipboard.writeText(`${window.location.origin}/share/${id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, position: 'relative' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--accent-sky)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  // Build full photo list for lightbox (AI cover + user photos)
  const allPhotos = [
    ...(fish.cover_photo && !fish.photos?.includes(fish.cover_photo) ? [proxyImage(fish.cover_photo)] : []),
    ...(fish.photos || []),
  ]

  return (
    <div style={{ height: '100%', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={allPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(8,20,46,0.94)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid rgba(255,128,102,0.25)',
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
                background: 'rgba(168,192,232,0.08)', color: 'var(--text-secondary)',
                fontSize: 14, fontWeight: 600, border: '1px solid var(--border-subtle)',
              }}>取消</button>
              <button onClick={handleDelete} disabled={deleting} style={{
                flex: 1, padding: '12px', borderRadius: 10,
                background: 'rgba(255,128,102,0.12)', border: '1px solid rgba(255,128,102,0.35)',
                color: 'var(--accent-coral)', fontSize: 14, fontWeight: 600,
              }}>{deleting ? '刪除中...' : '確定刪除'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Back / Actions */}
      <button onClick={() => navigate(-1)} style={{
        position: 'fixed', top: 'calc(var(--safe-top) + 12px)', left: 16, zIndex: 20,
        width: 36, height: 36, borderRadius: '50%',
        background: 'rgba(8,20,46,0.82)', backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-mid)', color: 'var(--text-primary)',
        fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>←</button>

      <div style={{ position: 'fixed', top: 'calc(var(--safe-top) + 12px)', right: 16, zIndex: 20, display: 'flex', gap: 8 }}>
        <button onClick={handleShare} style={{
          padding: '8px 14px', borderRadius: 20,
          background: copied ? 'rgba(110,226,208,0.15)' : 'rgba(8,20,46,0.82)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${copied ? 'var(--accent-mint)' : 'var(--border-mid)'}`,
          color: copied ? 'var(--accent-mint)' : 'var(--text-secondary)',
          fontSize: 12, transition: 'all 0.3s',
        }}>{copied ? '✓ 已複製' : '分享'}</button>
        <button onClick={() => setShowDeleteConfirm(true)} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(8,20,46,0.82)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,128,102,0.3)',
          color: 'var(--accent-coral)', fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>🗑</button>
      </div>

      {/* Cover photo — tap to open lightbox */}
      <div
        style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--bg-surface)', cursor: 'pointer' }}
        onClick={() => fish.cover_photo && setLightboxIndex(0)}
      >
        {fish.cover_photo ? (
          <img src={proxyImage(fish.cover_photo)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, opacity: 0.15 }}>🐟</div>
        )}
        {fish.cover_photo && (
          <div style={{
            position: 'absolute', bottom: 10, left: 10,
            background: 'rgba(8,20,46,0.75)', backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-mid)',
            borderRadius: 6, padding: '3px 9px', fontSize: 10, color: 'var(--accent-sky)',
          }}>封面照</div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px 80px' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{fish.name}</h1>
          {fish.scientific_name && (
            <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 14 }}>{fish.scientific_name}</p>
          )}
        </div>

        {/* Info table */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(26,52,112,0.7), rgba(30,61,130,0.5))',
          borderRadius: 16, border: '1px solid var(--border-subtle)',
          overflow: 'hidden', marginBottom: 24,
          backdropFilter: 'blur(8px)',
        }}>
          {INFO_ROWS.filter(row => row.key !== 'scientific_name' && fish[row.key] != null && fish[row.key] !== '').map((row, i, arr) => (
            <div key={row.key} style={{
              display: 'flex', alignItems: 'flex-start', padding: '12px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: 12,
            }}>
              <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{row.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.label}</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.55, fontStyle: row.italic ? 'italic' : 'normal' }}>
                  {`${fish[row.key]}${row.suffix || ''}`}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* My Photos */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              我的照片 ({fish.photos?.length || 0}/10)
            </h3>
            {(fish.photos?.length || 0) < 10 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 12,
                  background: 'rgba(168,192,232,0.1)', border: '1px solid var(--border-mid)',
                  color: 'var(--accent-sky)', fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              >{uploading ? '上傳中...' : '＋ 上傳'}</button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleAddPhotos} />

          {/* AI cover as selectable option */}
          {fish.cover_photo && !fish.photos?.includes(fish.cover_photo) && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>AI 辨識封面</p>
              <div style={{ display: 'inline-block', position: 'relative' }}>
                <img
                  src={proxyImage(fish.cover_photo)}
                  onClick={() => setLightboxIndex(0)}
                  style={{
                    width: 90, height: 90, objectFit: 'cover', borderRadius: 10,
                    border: '2px solid var(--accent-sky)', cursor: 'pointer',
                  }}
                />
                <div style={{
                  position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(74,114,196,0.9)', borderRadius: 4,
                  padding: '2px 6px', fontSize: 9, color: '#fff', whiteSpace: 'nowrap',
                }}>✓ 封面</div>
              </div>
            </div>
          )}

          {fish.photos?.length > 0 ? (
            <>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>點擊放大 · 點「設封面」選擇封面</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {fish.photos.map((url, i) => {
                  const isCover = fish.cover_photo === url
                  const lightboxIdx = (fish.cover_photo && !fish.photos.includes(fish.cover_photo) ? 1 : 0) + i
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
                        border: isCover ? '2px solid var(--accent-sky)' : '1px solid var(--border-subtle)',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <img
                        src={url}
                        onClick={() => setLightboxIndex(lightboxIdx)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                      />
                      {/* Cover badge */}
                      {isCover && (
                        <div style={{
                          position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                          background: 'rgba(74,114,196,0.92)', borderRadius: 4,
                          padding: '2px 6px', fontSize: 9, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap',
                        }}>✓ 封面</div>
                      )}
                      {/* Set cover */}
                      {!isCover && (
                        <button
                          onClick={() => handleSetCover(url)}
                          style={{
                            position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                            background: 'rgba(8,20,46,0.82)', backdropFilter: 'blur(6px)',
                            borderRadius: 4, padding: '2px 6px', fontSize: 9,
                            color: 'var(--accent-sky)', whiteSpace: 'nowrap',
                            border: '1px solid rgba(168,192,232,0.25)',
                          }}
                        >設封面</button>
                      )}
                      {/* Delete */}
                      <button
                        onClick={() => handleDeletePhoto(url)}
                        disabled={deletingPhoto === url}
                        style={{
                          position: 'absolute', top: 5, right: 5,
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'rgba(8,20,46,0.85)',
                          border: '1px solid rgba(255,128,102,0.5)',
                          color: 'var(--accent-coral)', fontSize: 13,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >{deletingPhoto === url ? '…' : '×'}</button>

                      {settingCover === url && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(74,114,196,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent-sky)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                        </div>
                      )}
                    </div>
                  )
                })}
                {fish.photos.length < 10 && (
                  <button onClick={() => fileInputRef.current?.click()} style={{
                    aspectRatio: '1', borderRadius: 10,
                    background: 'rgba(26,52,112,0.4)',
                    border: '1px dashed var(--border-mid)',
                    color: 'var(--text-muted)', fontSize: 22,
                  }}>+</button>
                )}
              </div>
            </>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} style={{
              width: '100%', padding: '22px 16px', borderRadius: 12,
              background: 'rgba(26,52,112,0.35)', border: '1px dashed var(--border-mid)',
              color: 'var(--text-muted)', fontSize: 13,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 26, opacity: 0.6 }}>📷</span>
              <span>上傳自己拍的照片</span>
            </button>
          )}
        </div>

        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          {new Date(fish.created_at).toLocaleDateString('zh-TW')} 新增
        </div>
      </div>
    </div>
  )
}
