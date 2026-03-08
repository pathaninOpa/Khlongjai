import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './Dashboard'
import Wearable from './Wearable'
import MapPage from './MapPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/wearable" element={<Wearable />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
