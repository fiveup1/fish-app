import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { inferCategory } from '../lib/categoryRules'

const CATEGORIES = ['魚', '蝦', '蟹', '貝', '花枝', '章魚', '其他']

const FIELD_LABELS = {
  scientific_name: '中文學名',
  common_names:    '常見別名',
  flavor:          '味道描述',
  texture:         '肉質',
  market_price:    '市場價格（元/斤）',
  cooking_methods: '料理方式',
  habitat_depth:   '棲息深度（公尺）',
  description:     '備註說明',
}

const S = {
  label: {
    display: 'block', fontSize: 11,
    color: 'var(--text-muted)', marginBottom: 5,
    fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%', padding: '10px 13px',
    background: 'rgba(26,52,112,0.55)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 10, fontSize: 14,
    color: 'var(--text-primary)',
    outline: 'none', transition: 'border-color 0.2s',
  },
}
const focusIn  = e => e.target.style.borderColor = 'var(--border-active)'
const focusOut = e => e.target.style.borderColor = 'var(--border-subtle)'

export default function AddPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [name, setName]         = useState('')
  const [category, setCategory] = useState('魚')
  const [fields, setFields]     = useState({})
  const [photos, setPhotos]     = useState([])
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [aiDone, setAiDone]       = useState(false)
  const [aiImageUrl, setAiImageUrl] = useState(null)

  async function handleAILookup() {
    if (!name.trim()) return
    setAiLoading(true); setError('')
    try {
      const res = await fetch('/api/fish-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const { suggested_image, latin_name, ...rest } = data

      // ── 分類推斷：規則優先，AI 備援 ──
      const ruleCategory = inferCategory(name.trim())
      const aiCategory   = rest.category
      const resolved     = ruleCategory || aiCategory || '其他'
      setCategory(resolved)

      setFields({ ...rest, category: resolved })
      setAiDone(true)
      if (suggested_image) setAiImageUrl(suggested_image)
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
      file, preview: URL.createObjectURL(file),
    }))
    setPhotos(prev => [...prev, ...toAdd])
  }

  function removePhoto(idx) {
    setPhotos(prev => {
      const next = [...prev]
      URL.revokeObjectURL(next[idx].preview)
      next.splice(idx, 1)
      return next
    })
  }

  async function handleSave() {
    if (!name.trim()) { setError('請輸入魚名'); return }
    setSaving(true); setError('')
    try {
      const { data: fish, error: insertErr } = await supabase
        .from('fishes')
        .insert({
          name: name.trim(),
          category,
          ...fields,
          market_price:  fields.market_price  ? parseFloat(fields.market_price)  : null,
          habitat_depth: fields.habitat_depth ? parseFloat(fields.habitat_depth) : null,
          cover_photo:    aiImageUrl || null,
          ai_cover_photo: aiImageUrl || null,   // ← 永久保留 AI 圖
          photos: [],
        })
        .select().single()
      if (insertErr) throw insertErr

      if (photos.length > 0) {
        const urls = []
        for (const { file } of photos) {
          const ext  = file.name.split('.').pop()
          const path = `${fish.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          await supabase.storage.from('fish-photos').upload(path, file)
          const { data } = supabase.storage.from('fish-photos').getPublicUrl(path)
          urls.push(data.publicUrl)
        }
        await supabase.from('fishes').update({ photos: urls }).eq('id', fish.id)
      }
      navigate(`/fish/${fish.id}`)
    } catch (e) {
      setError('儲存失敗：' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div style={{
        paddingTop: 'calc(var(--safe-top) + 8px)',
        padding: 'calc(var(--safe-top) + 8px) 16px 14px',
        background: 'var(--grad-header)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate('/')} style={{
          background: 'rgba(168,192,232,0.1)', color: 'var(--text-secondary)',
          fontSize: 18, width: 34, height: 34, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--border-subtle)',
        }}>←</button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>新增海鮮</h2>
      </div>

      {/* AI cover preview */}
      {aiImageUrl && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: 'var(--bg-surface)', overflow: 'hidden' }}>
          <img
            src={`/api/image-proxy?url=${encodeURIComponent(aiImageUrl)}`}
            alt="封面"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setAiImageUrl(null)}
          />
          <div style={{
            position: 'absolute', bottom: 10, left: 10,
            background: 'rgba(8,20,46,0.75)', backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-mid)',
            borderRadius: 6, padding: '3px 9px', fontSize: 10, color: 'var(--accent-sky)',
          }}>✦ AI 封面圖</div>
        </div>
      )}

      <div style={{ padding: '20px 16px 120px' }}>

        {/* Fish name + AI button */}
        <section style={{ marginBottom: 20 }}>
          <label style={S.label}>魚種名稱</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：石狗公、黑鮪魚..."
              style={{ ...S.input, flex: 1 }}
              onFocus={focusIn} onBlur={focusOut}
              onKeyDown={e => e.key === 'Enter' && handleAILookup()}
            />
            <button
              onClick={handleAILookup}
              disabled={aiLoading || !name.trim()}
              style={{
                padding: '0 14px',
                background: aiLoading
                  ? 'rgba(26,52,112,0.6)'
                  : 'linear-gradient(135deg, #4a72c4, #a8c0e8)',
                color: aiLoading ? 'var(--text-muted)' : 'var(--bg-abyss)',
                borderRadius: 10, fontSize: 12, fontWeight: 700,
                whiteSpace: 'nowrap', transition: 'all 0.2s',
                border: aiLoading ? '1px solid var(--border-subtle)' : 'none',
                letterSpacing: '0.03em',
                boxShadow: aiLoading ? 'none' : '0 2px 12px rgba(74,114,196,0.45)',
              }}
            >{aiLoading ? '查詢中...' : '✦ AI 辨識加入魚池'}</button>
          </div>
        </section>

        {/* Category — always visible, manually editable */}
        <section style={{ marginBottom: 24 }}>
          <label style={S.label}>分類</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 13,
                  background: category === cat ? 'rgba(168,192,232,0.2)' : 'rgba(26,52,112,0.45)',
                  color: category === cat ? 'var(--accent-light)' : 'var(--text-muted)',
                  border: `1px solid ${category === cat ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                  transition: 'all 0.18s', fontWeight: category === cat ? 600 : 400,
                }}
              >{cat}</button>
            ))}
          </div>
          {aiDone && (
            <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              ✦ AI 已自動推斷分類，可手動調整
            </p>
          )}
        </section>

        {/* AI Fields */}
        {aiDone && (
          <section style={{ marginBottom: 24, animation: 'bubbleUp 0.4s var(--ease-ocean)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: 10, color: 'var(--accent-sky)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
                AI 查詢結果
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={S.label}>{label}</label>
                {key === 'description' || key === 'cooking_methods' ? (
                  <textarea
                    value={fields[key] || ''}
                    onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))}
                    rows={3} style={{ ...S.input, resize: 'vertical', lineHeight: 1.7 }}
                    onFocus={focusIn} onBlur={focusOut}
                  />
                ) : (
                  <input
                    value={fields[key] || ''}
                    onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))}
                    style={S.input} onFocus={focusIn} onBlur={focusOut}
                  />
                )}
              </div>
            ))}
          </section>
        )}

        {/* My Photos */}
        <section style={{ marginBottom: 24 }}>
          <label style={{ ...S.label, marginBottom: 8 }}>
            我的照片 <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({photos.length}/10)</span>
          </label>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoSelect} />
          {photos.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  <img src={p.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => removePhoto(i)} style={{
                    position: 'absolute', top: 5, right: 5,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'rgba(8,20,46,0.85)',
                    border: '1px solid rgba(255,128,102,0.5)',
                    color: 'var(--accent-coral)', fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>×</button>
                </div>
              ))}
              {photos.length < 10 && (
                <button onClick={() => fileInputRef.current?.click()} style={{
                  aspectRatio: '1', borderRadius: 10,
                  background: 'rgba(26,52,112,0.4)',
                  border: '1px dashed var(--border-mid)',
                  color: 'var(--text-muted)', fontSize: 22,
                }}>+</button>
              )}
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} style={{
              width: '100%', padding: '26px 16px', borderRadius: 12,
              background: 'rgba(26,52,112,0.35)',
              border: '1px dashed var(--border-mid)',
              color: 'var(--text-muted)', fontSize: 13,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
            }}>
              <span style={{ fontSize: 28, opacity: 0.6 }}>📷</span>
              <span>點擊上傳照片（最多 10 張）</span>
            </button>
          )}
        </section>

        {error && (
          <div style={{
            padding: '10px 14px', marginBottom: 16,
            background: 'rgba(255,128,102,0.08)', border: '1px solid rgba(255,128,102,0.3)',
            borderRadius: 8, color: 'var(--accent-coral)', fontSize: 13,
          }}>{error}</div>
        )}

        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: '15px',
          background: saving ? 'rgba(26,52,112,0.5)' : 'linear-gradient(135deg, #4a72c4, #a8c0e8)',
          color: saving ? 'var(--text-muted)' : 'var(--bg-abyss)',
          borderRadius: 12, fontSize: 15, fontWeight: 700,
          fontFamily: 'var(--font-display)',
          boxShadow: saving ? 'none' : '0 4px 20px rgba(74,114,196,0.4)',
          transition: 'all 0.2s',
        }}>
          {saving ? '儲存中...' : '儲存到圖鑑'}
        </button>
      </div>
    </div>
  )
}
