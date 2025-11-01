import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@fmap/shared-utils';

export default function Profile() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignOut = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await signOut();

      if (error) {
        setError(error.message || 'Failed to sign out. Please try again.');
      } else {
        // Redirect to home page after sign out
        navigate('/');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="profile-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-container">
        <div className="error-message">
          You must be signed in to view this page.
        </div>
        <Link to="/login" className="btn-primary">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h1>My Profile</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="profile-info">
          <div className="info-group">
            <label>Email</label>
            <p>{user.email}</p>
          </div>

          {user.user_metadata?.name && (
            <div className="info-group">
              <label>Name</label>
              <p>{user.user_metadata.name}</p>
            </div>
          )}

          <div className="info-group">
            <label>User ID</label>
            <p className="user-id">{user.id}</p>
          </div>

          <div className="info-group">
            <label>Account Created</label>
            <p>{new Date(user.created_at).toLocaleDateString()}</p>
          </div>

          {user.last_sign_in_at && (
            <div className="info-group">
              <label>Last Sign In</label>
              <p>{new Date(user.last_sign_in_at).toLocaleString()}</p>
            </div>
          )}
        </div>

        <div className="profile-actions">
          <button
            onClick={handleSignOut}
            className="btn-secondary"
            disabled={loading}
          >
            {loading ? 'Signing out...' : 'Sign Out'}
          </button>
          <Link to="/" className="btn-link">
            Back to Home
          </Link>
        </div>
      </div>

      <div className="profile-card">
        <h2>Quick Links</h2>
        <nav className="profile-nav">
          <Link to="/upload" className="nav-item">
            Upload Waypoints
          </Link>
          <Link to="/waypoints" className="nav-item">
            My Waypoints
          </Link>
          <Link to="/map" className="nav-item">
            Map View
          </Link>
        </nav>
      </div>
    </div>
  );
}
