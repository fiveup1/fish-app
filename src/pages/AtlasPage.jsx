import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { proxyImage } from '../lib/imageProxy'

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: '魚',  label: '魚' },
  { key: '蝦',  label: '蝦' },
  { key: '蟹',  label: '蟹' },
  { key: '貝',  label: '貝' },
  { key: '花枝', label: '花枝' },
  { key: '章魚', label: '章魚' },
  { key: '其他', label: '其他' },
]

function FishCard({ fish, onClick }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const cover = proxyImage(fish.cover_photo)

  return (
    <div onClick={onClick} style={{
      background: 'linear-gradient(145deg, #1c2840, #212f4a)',
      border: '1px solid rgba(201,169,110,0.15)',
      borderRadius: 16,
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all 0.2s var(--ease-ocean)',
      boxShadow: '0 4px 20px rgba(8,12,20,0.5)',
      position: 'relative',
    }}
      onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.borderColor = 'rgba(201,169,110,0.4)' }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'rgba(201,169,110,0.15)' }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'linear-gradient(180deg, #d4a855, transparent)', zIndex: 2 }} />

      <div style={{ aspectRatio: '4/3', background: 'var(--bg-surface)', position: 'relative', overflow: 'hidden' }}>
        {cover ? (
          <>
            {!imgLoaded && <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />}
            <img
              src={cover}
              alt={fish.name}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
            />
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, opacity: 0.12 }}>🐟</div>
        )}
        {fish.category && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(8,12,20,0.80)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(201,169,110,0.25)',
            borderRadius: 6, padding: '2px 7px',
            fontSize: 9, color: '#c9a96e', fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em',
          }}>{fish.category}</div>
        )}
      </div>

      <div style={{ padding: '10px 12px 12px 14px' }}>
        <div style={{ fontSize: 15, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fish.name}</div>
        {fish.scientific_name && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{fish.scientific_name}</div>
        )}
        {fish.market_price && (
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#d4a855' }}>¥ {fish.market_price} <span style={{ color: 'var(--text-muted)' }}>/斤</span></div>
        )}
      </div>
    </div>
  )
}

// ── 全域 cache：App 生命週期內只撈一次 ──────────────────────
let _allFishes  = null   // 全部文字資料（含 common_names）
let _imageMap   = null   // id → cover_photo URL
let _fetchingText  = false
let _fetchingImg   = false

async function ensureTextLoaded() {
  if (_allFishes) return _allFishes
  if (_fetchingText) {
    // 等另一個 call 完成
    await new Promise(r => setTimeout(r, 80))
    return ensureTextLoaded()
  }
  _fetchingText = true
  const { data } = await supabase
    .from('fishes')
    .select('id,name,scientific_name,category,market_price,common_names')
    .order('created_at', { ascending: false })
    .limit(2000)
  _allFishes = data || []
  _fetchingText = false
  return _allFishes
}

async function ensureImagesLoaded(ids) {
  if (_imageMap) return _imageMap
  if (_fetchingImg) return null
  _fetchingImg = true
  const { data } = await supabase
    .from('fishes')
    .select('id,cover_photo')
    .in('id', ids)
  _imageMap = {}
  ;(data || []).forEach(r => { if (r.cover_photo) _imageMap[r.id] = r.cover_photo })
  _fetchingImg = false
  return _imageMap
}

export function invalidateFishCache() {
  _allFishes = null
  _imageMap  = null
}

// ── 搜尋過濾 + 排序（本地，即時）sort: 'default'|'price_asc'|'price_desc'
function applyFilter(list, search, category, sort) {
  let out = list
  if (category !== 'all') out = out.filter(f => f.category === category)
  if (search) {
    const q = search.toLowerCase()
    out = out.filter(f =>
      f.name?.toLowerCase().includes(q) ||
      f.scientific_name?.toLowerCase().includes(q) ||
      f.common_names?.toLowerCase().includes(q)
    )
  }
  if (sort === 'price_asc' || sort === 'price_desc') {
    const asc = sort === 'price_asc'
    out = [...out].sort((a, b) => {
      const pa = parseFloat(a.market_price) || 0
      const pb = parseFloat(b.market_price) || 0
      if (!pa && !pb) return 0
      if (!pa) return 1   // 無價格排最後
      if (!pb) return -1
      return asc ? pa - pb : pb - pa
    })
  }
  return out
}

export default function AtlasPage() {
  const navigate = useNavigate()

  const [allFishes, setAllFishes] = useState(_allFishes || [])
  const [imageMap,  setImageMap]  = useState(_imageMap  || {})
  const [loading,   setLoading]   = useState(!_allFishes)
  const [search,    setSearch]    = useState('')
  const [category,  setCategory]  = useState('all')
  const [sort,      setSort]      = useState('default')

  // 把 imageMap patch 進 allFishes 後的合併結果
  const fishes = applyFilter(
    allFishes.map(f => ({ ...f, cover_photo: imageMap[f.id] ?? f.cover_photo ?? null })),
    search, category, sort
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      // Step 1：文字（快，無圖片 URL，進場後立刻可搜）
      const text = await ensureTextLoaded()
      if (cancelled) return
      setAllFishes([...text])
      setLoading(false)

      // Step 2：圖片（背景，一次來回）
      if (!_imageMap) {
        const ids = text.map(f => f.id)
        const imgs = await ensureImagesLoaded(ids)
        if (cancelled || !imgs) return
        setImageMap({ ...imgs })
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // 新增/刪除後需要清 cache 並重撈（由外部呼叫 invalidateFishCache() 觸發）
  // 這裡監聽 Supabase realtime 讓資料自動更新
  useEffect(() => {
    const channel = supabase
      .channel('atlas-fishes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fishes' }, () => {
        _allFishes = null
        _imageMap  = null
        setLoading(true)
        ensureTextLoaded().then(text => {
          setAllFishes([...text])
          setLoading(false)
          const ids = text.map(f => f.id)
          ensureImagesLoaded(ids).then(imgs => { if (imgs) setImageMap({ ...imgs }) })
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div style={{
        paddingTop: 'calc(var(--safe-top) + 4px)',
        padding: 'calc(var(--safe-top) + 4px) 16px 12px',
        background: 'rgba(8,12,20,0.96)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(201,169,110,0.10)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--cream)', letterSpacing: '0.02em' }}>鰭跡地圖</h1>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#d4a855', opacity: 0.7 }}>{fishes.length} 種</span>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋魚名、學名、常見別名..."
            style={{
              width: '100%', padding: '9px 12px 9px 30px',
              background: 'rgba(28,40,64,0.8)', border: '1px solid rgba(201,169,110,0.12)',
              borderRadius: 10, fontSize: 13, color: 'var(--text-primary)', outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(201,169,110,0.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(201,169,110,0.12)'} />
        </div>

        {/* Category pills + sort row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Category pills — scrollable */}
          <div style={{ flex: 1, display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
            {CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => setCategory(cat.key)} style={{
                flexShrink: 0, padding: '4px 13px', borderRadius: 20, fontSize: 11,
                background: category === cat.key ? 'rgba(201,169,110,0.15)' : 'rgba(28,40,64,0.6)',
                color: category === cat.key ? '#d4a855' : 'var(--text-muted)',
                border: `1px solid ${category === cat.key ? 'rgba(201,169,110,0.45)' : 'rgba(201,169,110,0.08)'}`,
                transition: 'all 0.15s', fontWeight: category === cat.key ? 600 : 400,
              }}>{cat.label}</button>
            ))}
          </div>

          {/* Price sort button — cycles: default → asc → desc → default */}
          <button
            onClick={() => setSort(s => s === 'default' ? 'price_asc' : s === 'price_asc' ? 'price_desc' : 'default')}
            title="依價格排序"
            style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '4px 10px', borderRadius: 20, fontSize: 11,
              background: sort !== 'default' ? 'rgba(201,169,110,0.15)' : 'rgba(28,40,64,0.6)',
              color: sort !== 'default' ? '#d4a855' : 'var(--text-muted)',
              border: `1px solid ${sort !== 'default' ? 'rgba(201,169,110,0.45)' : 'rgba(201,169,110,0.08)'}`,
              transition: 'all 0.15s', fontWeight: sort !== 'default' ? 600 : 400,
            }}
          >
            💰
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
              {sort === 'price_asc' ? '↑' : sort === 'price_desc' ? '↓' : '—'}
            </span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 8px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '3/4', borderRadius: 16 }} />)}
          </div>
        ) : fishes.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)', gap: 10 }}>
            <span style={{ fontSize: 36 }}>🌊</span>
            <span style={{ fontSize: 13 }}>
              {search || category !== 'all' ? '找不到符合的結果' : '尚無資料，去新增第一筆吧！'}
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {fishes.map(fish => <FishCard key={fish.id} fish={fish} onClick={() => navigate(`/fish/${fish.id}`)} />)}
          </div>
        )}
      </div>
    </div>
  )
}
