import { Routes, Route } from 'react-router-dom'
import KDS from './pages/KDS'
import FrontDesk from './pages/FrontDesk'

function App() {
  return (
    <div className="kiosk-mode">
      <Routes>
        <Route path="/kds" element={<KDS />} />
        <Route path="/front-desk" element={<FrontDesk />} />
        <Route path="/" element={<KDS />} />
      </Routes>
    </div>
  )
}

export default App
