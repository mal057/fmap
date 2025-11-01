import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFiles, formatFileSize, formatRelativeTime, type FileMetadata, type PaginationInfo } from '../utils/api';

type ViewMode = 'grid' | 'list';

export default function Maps() {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  const fetchFiles = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getFiles({
        page,
        limit: 20,
        search: searchQuery,
        brand: brandFilter,
      });

      setFiles(result.files);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(1);
  }, [searchQuery, brandFilter]);

  const handlePageChange = (newPage: number) => {
    fetchFiles(newPage);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchFiles(1);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1>Fish Finder Files</h1>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <Link to="/">Home</Link>
          <Link to="/upload">Upload Files</Link>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <form onSubmit={handleSearch} style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
        </form>

        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          style={{
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '1rem',
          }}
        >
          <option value="">All Brands</option>
          <option value="lowrance">Lowrance</option>
          <option value="garmin">Garmin</option>
          <option value="humminbird">Humminbird</option>
          <option value="raymarine">Raymarine</option>
          <option value="simrad">Simrad</option>
          <option value="furuno">Furuno</option>
          <option value="other">Other</option>
        </select>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '0.75rem 1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: viewMode === 'grid' ? '#007bff' : 'white',
              color: viewMode === 'grid' ? 'white' : '#333',
              cursor: 'pointer',
            }}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '0.75rem 1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: viewMode === 'list' ? '#007bff' : 'white',
              color: viewMode === 'list' ? 'white' : '#333',
              cursor: 'pointer',
            }}
          >
            List
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          Loading files...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      {/* Files Grid/List */}
      {!loading && !error && files.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <p>No files found.</p>
          <Link to="/upload" style={{ color: '#007bff' }}>
            Upload your first file
          </Link>
        </div>
      )}

      {!loading && !error && files.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {files.map((file) => (
                <Link
                  key={file.id}
                  to={`/maps/${file.id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    backgroundColor: '#fff',
                    transition: 'box-shadow 0.3s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📄</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>{file.display_name}</h3>
                    <p style={{ color: '#666', fontSize: '0.875rem', margin: '0' }}>
                      {file.original_filename}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Size:</span>
                      <span>{formatFileSize(file.file_size)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Brand:</span>
                      <span style={{ textTransform: 'capitalize' }}>{file.brand}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Uploaded:</span>
                      <span>{formatRelativeTime(file.uploaded_at)}</span>
                    </div>
                    {file.user_profiles && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>By:</span>
                        <span>{file.user_profiles.display_name || file.user_profiles.username}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee', display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#666' }}>
                    <span>👁 {file.view_count || 0}</span>
                    <span>⬇ {file.download_count || 0}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Brand</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Size</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Uploader</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Uploaded</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Downloads</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '1rem' }}>
                        <Link to={`/maps/${file.id}`} style={{ color: '#007bff', textDecoration: 'none' }}>
                          {file.display_name}
                        </Link>
                        <div style={{ fontSize: '0.875rem', color: '#666' }}>{file.original_filename}</div>
                      </td>
                      <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{file.brand}</td>
                      <td style={{ padding: '1rem' }}>{formatFileSize(file.file_size)}</td>
                      <td style={{ padding: '1rem' }}>
                        {file.user_profiles?.display_name || file.user_profiles?.username || 'Unknown'}
                      </td>
                      <td style={{ padding: '1rem' }}>{formatRelativeTime(file.uploaded_at)}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>{file.download_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: pagination.page === 1 ? '#f8f9fa' : 'white',
                  cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>

              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: pagination.page === pagination.totalPages ? '#f8f9fa' : 'white',
                  cursor: pagination.page === pagination.totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}

          {/* Results Summary */}
          <div style={{ textAlign: 'center', marginTop: '1rem', color: '#666', fontSize: '0.875rem' }}>
            Showing {files.length} of {pagination.total} files
          </div>
        </>
      )}
    </div>
  );
}
