import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['魚', '蝦', '蟹', '貝', '花枝', '章魚', '其他']

const FIELD_LABELS = {
  scientific_name: '中文學名',
  common_names: '常見別名',
  flavor: '味道描述',
  texture: '肉質',
  market_price: '市場價格（元/斤）',
  cooking_methods: '料理方式',
  habitat_depth: '棲息深度（公尺）',
  description: '備註說明',
}

export default function AddPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('魚')
  const [fields, setFields] = useState({})
  const [photos, setPhotos] = useState([]) // { file, preview }
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [aiDone, setAiDone] = useState(false)
  const [suggestedImage, setSuggestedImage] = useState(null)
  const [usingSuggestedImage, setUsingSuggestedImage] = useState(false)

  async function handleAILookup() {
    if (!name.trim()) return
    setAiLoading(true)
    setError('')
    try {
      const res = await fetch('/api/fish-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const { suggested_image, image_search_query, ...rest } = data
      setFields(rest)
      setAiDone(true)

      if (suggested_image) {
        setSuggestedImage(suggested_image)
        setUsingSuggestedImage(true)
      }
    } catch (e) {
      setError('AI 查詢失敗：' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  function handlePhotoSelect(e) {
    const files = Array.from(e.target.files)
    const remaining = 10 - photos.length
    const toAdd = files.slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setPhotos(prev => [...prev, ...toAdd])
    // If user uploads manually, stop using suggested image
    setUsingSuggestedImage(false)
  }

  function removePhoto(idx) {
    setPhotos(prev => {
      const next = [...prev]
      URL.revokeObjectURL(next[idx].preview)
      next.splice(idx, 1)
      return next
    })
  }

  async function uploadPhotos(fishId) {
    const urls = []
    for (const { file } of photos) {
      const ext = file.name.split('.').pop()
      const path = `${fishId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('fish-photos').upload(path, file)
      if (error) throw error
      const { data } = supabase.storage.from('fish-photos').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
    return urls
  }

  async function handleSave() {
    if (!name.trim()) { setError('請輸入魚名'); return }
    setSaving(true)
    setError('')
    try {
      // Build initial photos array
      let initialPhotos = []
      if (usingSuggestedImage && suggestedImage) {
        initialPhotos = [suggestedImage]
      }

      const { data: fish, error: insertErr } = await supabase
        .from('fishes')
        .insert({
          name: name.trim(),
          category,
          scientific_name: fields.scientific_name || null,
          common_names: fields.common_names || null,
          flavor: fields.flavor || null,
          texture: fields.texture || null,
          market_price: fields.market_price ? parseFloat(fields.market_price) : null,
          cooking_methods: fields.cooking_methods || null,
          habitat_depth: fields.habitat_depth ? parseFloat(fields.habitat_depth) : null,
          description: fields.description || null,
          photos: initialPhotos,
        })
        .select()
        .single()

      if (insertErr) throw insertErr

      // Upload user photos
      if (photos.length > 0) {
        const uploadedUrls = await uploadPhotos(fish.id)
        const allPhotos = [...initialPhotos, ...uploadedUrls]
        await supabase.from('fishes').update({ photos: allPhotos }).eq('id', fish.id)
      }

      navigate(`/fish/${fish.id}`)
    } catch (e) {
      setError('儲存失敗：' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // Preview photo to show at top
  const topPreview = usingSuggestedImage && suggestedImage
    ? suggestedImage
    : photos.length > 0 ? photos[0].preview : null

  return (
    <div style={{ height: '100%', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div style={{
        paddingTop: 'calc(var(--safe-top) + 8px)',
        padding: 'calc(var(--safe-top) + 8px) 16px 16px',
        background: 'rgba(2, 13, 24, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', color: 'var(--text-secondary)', fontSize: 20 }}>←</button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>新增海鮮</h2>
      </div>

      {/* Top Photo Preview */}
      {topPreview && (
        <div style={{
          width: '100%',
          aspectRatio: '16/9',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg-surface)',
        }}>
          <img
            src={topPreview}
            alt="預覽"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => { if (usingSuggestedImage) setUsingSuggestedImage(false) }}
          />
          {usingSuggestedImage && (
            <div style={{
              position: 'absolute', bottom: 8, left: 8,
              background: 'rgba(0, 229, 255, 0.15)',
              border: '1px solid rgba(0, 229, 255, 0.4)',
              borderRadius: 6,
              padding: '3px 8px',
              fontSize: 10,
              color: 'var(--accent-biolum)',
            }}>
              ✦ AI 自動找圖
            </div>
          )}
          {usingSuggestedImage && (
            <button
              onClick={() => setUsingSuggestedImage(false)}
              style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                borderRadius: '50%',
                width: 24, height: 24,
                fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>
          )}
        </div>
      )}

      <div style={{ padding: '16px 16px 120px' }}>
        {/* Name + Category */}
        <section style={{ marginBottom: 20 }}>
          <label style={labelStyle}>魚種名稱</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：黑鮪魚、劍蝦..."
              style={{ ...inputStyle, flex: 1 }}
              onFocus={e => e.target.style.borderColor = 'var(--border-active)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
              onKeyDown={e => e.key === 'Enter' && handleAILookup()}
            />
            <button
              onClick={handleAILookup}
              disabled={aiLoading || !name.trim()}
              style={{
                padding: '0 16px',
                background: aiLoading ? 'var(--bg-elevated)' : 'var(--accent-biolum)',
                color: aiLoading ? 'var(--text-muted)' : 'var(--bg-abyss)',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {aiLoading ? '查詢中...' : '✦ AI 查詢'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 16,
                  fontSize: 12,
                  background: category === cat ? 'rgba(0, 229, 255, 0.15)' : 'var(--bg-card)',
                  color: category === cat ? 'var(--accent-biolum)' : 'var(--text-muted)',
                  border: `1px solid ${category === cat ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                  transition: 'all 0.2s',
                }}
              >{cat}</button>
            ))}
          </div>
        </section>

        {/* AI Result Fields */}
        {aiDone && (
          <section style={{ marginBottom: 20, animation: 'bubbleUp 0.4s var(--ease-ocean)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: 11, color: 'var(--accent-biolum)', fontFamily: 'var(--font-mono)' }}>AI 查詢結果</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{label}</label>
                {key === 'description' || key === 'cooking_methods' ? (
                  <textarea
                    value={fields[key] || ''}
                    onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                    onFocus={e => e.target.style.borderColor = 'var(--border-active)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                  />
                ) : (
                  <input
                    value={fields[key] || ''}
                    onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--border-active)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                  />
                )}
              </div>
            ))}
          </section>
        )}

        {/* Suggested image toggle (if dismissed) */}
        {suggestedImage && !usingSuggestedImage && (
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => setUsingSuggestedImage(true)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 10,
                background: 'rgba(0, 229, 255, 0.05)',
                border: '1px dashed var(--border-active)',
                color: 'var(--accent-biolum)',
                fontSize: 12,
              }}
            >
              ✦ 使用 AI 找到的圖片
            </button>
          </div>
        )}

        {/* Photos */}
        <section style={{ marginBottom: 24 }}>
          <label style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between' }}>
            <span>自行上傳照片 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({photos.length}/10)</span></span>
            {photos.length < 10 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ color: 'var(--accent-biolum)', fontSize: 12, background: 'none', fontFamily: 'var(--font-body)' }}
              >+ 新增</button>
            )}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handlePhotoSelect}
          />
          {photos.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden' }}>
                  <img src={p.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => removePhoto(i)}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white', fontSize: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >×</button>
                </div>
              ))}
              {photos.length < 10 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    aspectRatio: '1', borderRadius: 8,
                    background: 'var(--bg-card)',
                    border: '1px dashed var(--border-subtle)',
                    color: 'var(--text-muted)', fontSize: 24,
                  }}
                >+</button>
              )}
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%', padding: '24px', borderRadius: 12,
                background: 'var(--bg-card)',
                border: '1px dashed var(--border-subtle)',
                color: 'var(--text-muted)', fontSize: 13,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 28 }}>📷</span>
              <span>點擊上傳照片（最多 10 張）</span>
            </button>
          )}
        </section>

        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            borderRadius: 8,
            color: 'var(--accent-coral)',
            fontSize: 13,
            marginBottom: 16,
          }}>{error}</div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '16px', borderRadius: 12,
            background: saving ? 'var(--bg-elevated)' : 'linear-gradient(135deg, #00e5ff, #0099cc)',
            color: saving ? 'var(--text-muted)' : 'var(--bg-abyss)',
            fontSize: 16, fontWeight: 700,
            fontFamily: 'var(--font-display)',
            transition: 'all 0.2s',
            boxShadow: saving ? 'none' : '0 4px 20px rgba(0, 229, 255, 0.3)',
          }}
        >
          {saving ? '儲存中...' : '儲存到圖鑑'}
        </button>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  color: 'var(--text-muted)',
  marginBottom: 6,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.05em',
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  fontSize: 14,
  color: 'var(--text-primary)',
  outline: 'none',
  transition: 'border-color 0.2s',
}
