import { Routes, Route } from 'react-router-dom'
import TabBar from './components/TabBar'
import AtlasPage from './pages/AtlasPage'
import AddPage from './pages/AddPage'
import DepthPage from './pages/DepthPage'
import DetailPage from './pages/DetailPage'
import SharePage from './pages/SharePage'
import OceanBackground from './components/OceanBackground'

export default function App() {
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <OceanBackground />
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Routes>
          <Route path="/" element={<AtlasPage />} />
          <Route path="/add" element={<AddPage />} />
          <Route path="/depth" element={<DepthPage />} />
          <Route path="/fish/:id" element={<DetailPage />} />
          <Route path="/share/:id" element={<SharePage />} />
        </Routes>
      </div>
      <TabBar />
    </div>
  )
}
