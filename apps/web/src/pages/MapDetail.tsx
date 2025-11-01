import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { getFile, downloadFile, deleteFile, formatFileSize, formatRelativeTime, type FileMetadata } from '../utils/api';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function MapDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchFile = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const fileData = await getFile(id);
        setFile(fileData);

        // Check if current user is the owner
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === fileData.user_id) {
          setIsOwner(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [id]);

  const handleDownload = async () => {
    if (!file) return;

    setDownloading(true);
    try {
      await downloadFile(file.id, file.original_filename);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!file) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${file.display_name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteFile(file.id);
      alert('File deleted successfully');
      navigate('/maps');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete file');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
        Loading file details...
      </div>
    );
  }

  if (error || !file) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ padding: '1rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '2rem' }}>
          {error || 'File not found'}
        </div>
        <Link to="/maps">Back to Files</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/maps">Files</Link>
        <span>/</span>
        <span>{file.display_name}</span>
      </div>

      {/* File Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0' }}>{file.display_name}</h1>
            <p style={{ color: '#666', margin: 0 }}>{file.original_filename}</p>
          </div>
          <div style={{ fontSize: '4rem' }}>📄</div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: downloading ? 'not-allowed' : 'pointer',
              opacity: downloading ? 0.6 : 1,
            }}
          >
            {downloading ? 'Downloading...' : '⬇ Download File'}
          </button>

          {isOwner && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: deleting ? 'not-allowed' : 'pointer',
                opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? 'Deleting...' : '🗑 Delete File'}
            </button>
          )}
        </div>
      </div>

      {/* File Information */}
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '2rem', backgroundColor: '#fff', marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0 }}>File Information</h2>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1rem' }}>
            <strong>File Size:</strong>
            <span>{formatFileSize(file.file_size)}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1rem' }}>
            <strong>File Type:</strong>
            <span>.{file.file_extension}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1rem' }}>
            <strong>Fish Finder Brand:</strong>
            <span style={{ textTransform: 'capitalize' }}>{file.brand}</span>
          </div>

          {file.location && (
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1rem' }}>
              <strong>Location:</strong>
              <span>{file.location}</span>
            </div>
          )}

          {file.description && (
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1rem' }}>
              <strong>Description:</strong>
              <span>{file.description}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1rem' }}>
            <strong>Uploaded:</strong>
            <span>
              {formatRelativeTime(file.uploaded_at)} ({new Date(file.uploaded_at).toLocaleString()})
            </span>
          </div>

          {file.user_profiles && (
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1rem' }}>
              <strong>Uploaded By:</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {file.user_profiles.avatar_url && (
                  <img
                    src={file.user_profiles.avatar_url}
                    alt={file.user_profiles.display_name || file.user_profiles.username}
                    style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                  />
                )}
                <span>{file.user_profiles.display_name || file.user_profiles.username}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '2rem', backgroundColor: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>Statistics</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '2rem', color: '#007bff', marginBottom: '0.5rem' }}>
              {file.view_count || 0}
            </div>
            <div style={{ color: '#666' }}>Views</div>
          </div>

          <div>
            <div style={{ fontSize: '2rem', color: '#28a745', marginBottom: '0.5rem' }}>
              {file.download_count || 0}
            </div>
            <div style={{ color: '#666' }}>Downloads</div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div style={{ marginTop: '2rem' }}>
        <Link
          to="/maps"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
          }}
        >
          ← Back to All Files
        </Link>
      </div>
    </div>
  );
}
