import { Routes, Route, Link } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

function Home() {
  return (
    <div>
      <h1>FishMap</h1>
      <p>Welcome to FishMap - Your cross-platform fish finder waypoint manager</p>
      <nav>
        <ul>
          <li><Link to="/upload">Upload Waypoints</Link></li>
          <li><Link to="/waypoints">View Waypoints</Link></li>
          <li><Link to="/map">Map View</Link></li>
        </ul>
      </nav>
    </div>
  )
}

function Upload() {
  return (
    <div>
      <h2>Upload Waypoints</h2>
      <p>Upload waypoint files from Lowrance, Garmin, or Humminbird devices</p>
      <Link to="/">Back to Home</Link>
    </div>
  )
}

function Waypoints() {
  return (
    <div>
      <h2>My Waypoints</h2>
      <p>View and manage your saved waypoints</p>
      <Link to="/">Back to Home</Link>
    </div>
  )
}

function MapView() {
  return (
    <div>
      <h2>Map View</h2>
      <p>View your waypoints on a map</p>
      <Link to="/">Back to Home</Link>
    </div>
  )
}

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/waypoints" element={<Waypoints />} />
        <Route path="/map" element={<MapView />} />
      </Routes>
    </div>
  )
}

export default App
