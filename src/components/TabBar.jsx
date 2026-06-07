import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  {
    path: '/',
    label: '圖鑑',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" fill={active ? '#00e5ff' : 'none'} stroke={active ? '#00e5ff' : '#4a7a94'} strokeWidth="1.5"/>
        <rect x="13" y="3" width="8" height="8" rx="2" fill={active ? '#00e5ff22' : 'none'} stroke={active ? '#00e5ff' : '#4a7a94'} strokeWidth="1.5"/>
        <rect x="3" y="13" width="8" height="8" rx="2" fill={active ? '#00e5ff22' : 'none'} stroke={active ? '#00e5ff' : '#4a7a94'} strokeWidth="1.5"/>
        <rect x="13" y="13" width="8" height="8" rx="2" fill={active ? '#00e5ff22' : 'none'} stroke={active ? '#00e5ff' : '#4a7a94'} strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    path: '/add',
    label: '新增',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" fill={active ? '#00e5ff' : 'none'} stroke={active ? '#00e5ff' : '#4a7a94'} strokeWidth="1.5"/>
        <path d="M12 8v8M8 12h8" stroke={active ? '#020d18' : '#4a7a94'} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    path: '/depth',
    label: '深度圖',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M3 6c3 0 3 3 6 3s3-3 6-3 3 3 6 3" stroke={active ? '#00e5ff' : '#4a7a94'} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M3 12c3 0 3 3 6 3s3-3 6-3 3 3 6 3" stroke={active ? '#00e5ff' : '#4a7a94'} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
        <path d="M3 18c3 0 3 3 6 3s3-3 6-3 3 3 6 3" stroke={active ? '#00e5ff' : '#4a7a94'} strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
      </svg>
    ),
  },
]

export default function TabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  // Hide tab bar on detail and share pages
  if (location.pathname.startsWith('/fish/') || location.pathname.startsWith('/share/')) return null

  return (
    <nav style={{
      position: 'relative',
      zIndex: 100,
      display: 'flex',
      alignItems: 'stretch',
      background: 'rgba(2, 13, 24, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(0, 229, 255, 0.1)',
      paddingBottom: 'env(safe-area-inset-bottom, 20px)',
    }}>
      {tabs.map(tab => {
        const active = location.pathname === tab.path
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '10px 0',
              background: 'none',
              transition: 'opacity 0.2s',
              opacity: active ? 1 : 0.6,
            }}
          >
            {tab.icon(active)}
            <span style={{
              fontSize: 10,
              fontFamily: 'var(--font-body)',
              color: active ? 'var(--accent-biolum)' : 'var(--text-muted)',
              letterSpacing: '0.05em',
              fontWeight: active ? 500 : 400,
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
