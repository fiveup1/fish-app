import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  { key: 'all', label: '全部', emoji: '🌊' },
  { key: '魚', label: '魚', emoji: '🐟' },
  { key: '蝦', label: '蝦', emoji: '🦐' },
  { key: '蟹', label: '蟹', emoji: '🦀' },
  { key: '貝', label: '貝', emoji: '🐚' },
  { key: '花枝', label: '花枝', emoji: '🦑' },
  { key: '章魚', label: '章魚', emoji: '🐙' },
  { key: '其他', label: '其他', emoji: '🌿' },
]

function FishCard({ fish, onClick }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const primaryPhoto = fish.photos?.[0]

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.25s var(--ease-ocean)',
        animation: 'bubbleUp 0.4s var(--ease-ocean) both',
      }}
      onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
      onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {/* Photo */}
      <div style={{
        aspectRatio: '4/3',
        background: 'var(--bg-surface)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {primaryPhoto ? (
          <>
            {!imgLoaded && <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />}
            <img
              src={primaryPhoto}
              alt={fish.name}
              onLoad={() => setImgLoaded(true)}
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover',
                opacity: imgLoaded ? 1 : 0,
                transition: 'opacity 0.3s',
              }}
            />
          </>
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, opacity: 0.3,
          }}>
            🐟
          </div>
        )}
        {/* Sashimi badge */}
        {fish.sashimi_grade && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0, 229, 255, 0.2)',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            borderRadius: 4,
            padding: '2px 5px',
            fontSize: 9,
            color: 'var(--accent-biolum)',
            fontFamily: 'var(--font-mono)',
          }}>
            生魚片✓
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{
          fontSize: 15,
          fontFamily: 'var(--font-display)',
          color: 'var(--text-primary)',
          marginBottom: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {fish.name}
        </div>
        {fish.scientific_name && (
          <div style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 6,
          }}>
            {fish.scientific_name}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: 10,
            color: 'var(--text-secondary)',
            background: 'var(--border-subtle)',
            padding: '2px 6px',
            borderRadius: 4,
          }}>
            {fish.category || '未分類'}
          </span>
          {fish.market_price && (
            <span style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-gold)',
            }}>
              ¥{fish.market_price}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AtlasPage() {
  const navigate = useNavigate()
  const [fishes, setFishes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const loaderRef = useRef(null)
  const PAGE_SIZE = 24

  const fetchFishes = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page
    const from = currentPage * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('fishes')
      .select('id, name, scientific_name, category, market_price, sashimi_grade, photos')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (search) {
      query = query.or(`name.ilike.%${search}%,scientific_name.ilike.%${search}%`)
    }
    if (category !== 'all') {
      query = query.eq('category', category)
    }

    const { data, error } = await query
    if (error) { console.error(error); return }

    if (reset) {
      setFishes(data)
      setPage(1)
    } else {
      setFishes(prev => [...prev, ...data])
      setPage(p => p + 1)
    }
    setHasMore(data.length === PAGE_SIZE)
    setLoading(false)
  }, [search, category, page])

  // Reset on filter change
  useEffect(() => {
    setLoading(true)
    setPage(0)
    fetchFishes(true)
  }, [search, category]) // eslint-disable-line

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        fetchFishes(false)
      }
    }, { threshold: 0.1 })
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, fetchFishes])

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
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 12,
        background: 'rgba(2, 13, 24, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 12,
        }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}>
            海鮮圖鑑
          </h1>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--accent-biolum)',
            opacity: 0.7,
          }}>
            {fishes.length} 種
          </span>
        </div>

        {/* Search */}
        <div style={{
          position: 'relative',
          marginBottom: 10,
        }}>
          <svg style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋魚名、學名..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              fontSize: 14,
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--border-active)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </div>

        {/* Category Pills */}
        <div style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 2,
          scrollbarWidth: 'none',
        }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              style={{
                flexShrink: 0,
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontFamily: 'var(--font-body)',
                background: category === cat.key ? 'var(--accent-biolum)' : 'var(--bg-card)',
                color: category === cat.key ? 'var(--bg-abyss)' : 'var(--text-secondary)',
                border: `1px solid ${category === cat.key ? 'var(--accent-biolum)' : 'var(--border-subtle)'}`,
                transition: 'all 0.2s',
                fontWeight: category === cat.key ? 600 : 400,
              }}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 12px 8px',
      }}>
        {loading && fishes.length === 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '3/4', borderRadius: 12 }} />
            ))}
          </div>
        ) : fishes.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
            color: 'var(--text-muted)',
            gap: 8,
          }}>
            <span style={{ fontSize: 40 }}>🌊</span>
            <span style={{ fontSize: 14 }}>尚無資料，去新增第一筆吧！</span>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
            }}>
              {fishes.map((fish, i) => (
                <div key={fish.id} style={{ animationDelay: `${(i % PAGE_SIZE) * 0.03}s` }}>
                  <FishCard fish={fish} onClick={() => navigate(`/fish/${fish.id}`)} />
                </div>
              ))}
            </div>
            {/* Infinite scroll trigger */}
            <div ref={loaderRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loading && hasMore && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent-biolum)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              )}
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
