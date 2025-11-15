import { Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from '@fmap/shared-utils';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import EnvTest from './pages/EnvTest';
import UploadPage from './pages/Upload';

function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div>
      <header className="app-header">
        <h1>FishMap</h1>
        <nav className="user-nav">
          {isAuthenticated ? (
            <>
              <span>Welcome, {user?.email}</span>
              <Link to="/profile" className="btn-link">Profile</Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-link">Sign In</Link>
              <Link to="/register" className="btn-primary-small">Sign Up</Link>
            </>
          )}
        </nav>
      </header>

      <p>Welcome to FishMap - Your cross-platform fish finder waypoint manager</p>

      <nav>
        <ul>
          <li><Link to="/upload">Upload Waypoints</Link></li>
          <li><Link to="/waypoints">View Waypoints</Link></li>
          <li><Link to="/map">Map View</Link></li>
        </ul>
      </nav>
    </div>
  );
}

function Upload() {
  return (
    <div>
      <h2>Upload Waypoints</h2>
      <p>Upload waypoint files from Lowrance, Garmin, or Humminbird devices</p>
      <Link to="/">Back to Home</Link>
    </div>
  );
}

function Waypoints() {
  return (
    <div>
      <h2>My Waypoints</h2>
      <p>View and manage your saved waypoints</p>
      <Link to="/">Back to Home</Link>
    </div>
  );
}

function MapView() {
  return (
    <div>
      <h2>Map View</h2>
      <p>View your waypoints on a map</p>
      <Link to="/">Back to Home</Link>
    </div>
  );
}

function AppRoutes() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/env-test" element={<EnvTest />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/waypoints"
          element={
            <ProtectedRoute>
              <Waypoints />
            </ProtectedRoute>
          }
        />
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <MapView />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
