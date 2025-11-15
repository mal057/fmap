import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { uploadFile, formatFileSize } from '../utils/api';

const ALLOWED_EXTENSIONS = ['.slg', '.sl2', '.sl3', '.gpx', '.adm', '.dat', '.son', '.fsh', '.nv2', '.acd', '.acu'];
const MAX_FILE_SIZE = 524288000; // 500MB

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  id?: string;
}

export default function Upload() {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState<Record<string, { name: string; description: string; location: string; brand: string }>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 500MB';
    }
    return null;
  };

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const validFiles: FileWithProgress[] = [];

    Array.from(newFiles).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        validFiles.push({
          file,
          progress: 0,
          status: 'error',
          error,
        });
      } else {
        validFiles.push({
          file,
          progress: 0,
          status: 'pending',
        });
      }
    });

    setFiles((prev) => [...prev, ...validFiles]);

    // Initialize form data for new files
    const newFormData = { ...formData };
    validFiles.forEach((fileItem) => {
      if (fileItem.status !== 'error') {
        newFormData[fileItem.file.name] = {
          name: fileItem.file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          description: '',
          location: '',
          brand: 'lowrance',
        };
      }
    });
    setFormData(newFormData);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleFormChange = (fileName: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        [field]: value,
      },
    }));
  };

  const removeFile = (fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.file.name !== fileName));
    setFormData((prev) => {
      const newFormData = { ...prev };
      delete newFormData[fileName];
      return newFormData;
    });
  };

  const uploadSingleFile = async (fileItem: FileWithProgress, index: number) => {
    const data = formData[fileItem.file.name];

    if (!data.name || !data.brand) {
      setFiles((prev) => {
        const newFiles = [...prev];
        newFiles[index] = {
          ...newFiles[index],
          status: 'error',
          error: 'Name and brand are required',
        };
        return newFiles;
      });
      return;
    }

    setFiles((prev) => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], status: 'uploading' };
      return newFiles;
    });

    try {
      const result = await uploadFile(
        {
          file: fileItem.file,
          name: data.name,
          description: data.description,
          location: data.location,
          brand: data.brand,
        },
        (progress) => {
          setFiles((prev) => {
            const newFiles = [...prev];
            newFiles[index] = { ...newFiles[index], progress };
            return newFiles;
          });
        }
      );

      setFiles((prev) => {
        const newFiles = [...prev];
        newFiles[index] = {
          ...newFiles[index],
          status: 'success',
          progress: 100,
          id: result.id,
        };
        return newFiles;
      });
    } catch (error) {
      setFiles((prev) => {
        const newFiles = [...prev];
        newFiles[index] = {
          ...newFiles[index],
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed',
        };
        return newFiles;
      });
    }
  };

  const uploadAllFiles = async () => {
    const pendingFiles = files
      .map((f, index) => ({ file: f, index }))
      .filter((item) => item.file.status === 'pending');

    for (const item of pendingFiles) {
      await uploadSingleFile(item.file, item.index);
    }
  };

  const hasFilesToUpload = files.some((f) => f.status === 'pending');
  const allUploaded = files.length > 0 && files.every((f) => f.status === 'success');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Upload Fish Finder Files</h1>
        <p style={{ color: '#666' }}>
          Upload your fish finder files (.slg, .sl2, .sl3, .gpx, .adm, .dat, .son, .fsh)
        </p>
        <Link to="/">Back to Home</Link>
      </div>

      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? '#007bff' : '#ccc'}`,
          borderRadius: '8px',
          padding: '3rem',
          textAlign: 'center',
          backgroundColor: isDragging ? '#f0f8ff' : '#fafafa',
          marginBottom: '2rem',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        {/* Image Placeholder */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <div style={{
            width: '200px',
            height: '200px',
            margin: '0 auto 1.5rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #fff 0%, #f0f0f0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Fish mouth icon */}
              <div style={{
                fontSize: '4rem',
                color: '#667eea',
              }}>🐟</div>
            </div>
          </div>

          <h3 style={{ margin: '0 0 0.5rem 0' }}>Drop your fish finder files here</h3>
          <p style={{ color: '#666', margin: '0 0 1rem 0' }}>
            Supports .slg, .sl2, .sl3, .gpx, .adm, .dat, .son, .fsh, .nv2, .acd, .acu
          </p>
        </div>

        {/* Browse Files Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,123,255,0.3)',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#0056b3';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,123,255,0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#007bff';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,123,255,0.3)';
          }}
        >
          Browse Files
        </button>

        <p style={{ color: '#999', fontSize: '0.875rem', marginTop: '1rem' }}>
          Maximum file size: 500MB per file
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div>
          <h2>Files ({files.length})</h2>

          {files.map((fileItem, index) => {
            const data = formData[fileItem.file.name] || {
              name: '',
              description: '',
              location: '',
              brand: 'lowrance',
            };

            return (
              <div
                key={fileItem.file.name + index}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginBottom: '1rem',
                  backgroundColor: '#fff',
                }}
              >
                {/* File Info Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>{fileItem.file.name}</h3>
                    <p style={{ color: '#666', margin: 0 }}>{formatFileSize(fileItem.file.size)}</p>
                  </div>
                  <button
                    onClick={() => removeFile(fileItem.file.name)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc3545',
                      cursor: 'pointer',
                      fontSize: '1.5rem',
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Status and Progress */}
                {fileItem.status === 'error' && (
                  <div style={{ color: '#dc3545', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f8d7da', borderRadius: '4px' }}>
                    Error: {fileItem.error}
                  </div>
                )}

                {fileItem.status === 'success' && (
                  <div style={{ color: '#28a745', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#d4edda', borderRadius: '4px' }}>
                    Upload successful!{' '}
                    {fileItem.id && (
                      <Link to={`/maps/${fileItem.id}`}>View file</Link>
                    )}
                  </div>
                )}

                {fileItem.status === 'uploading' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Uploading...</span>
                      <span>{Math.round(fileItem.progress)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${fileItem.progress}%`,
                          height: '100%',
                          backgroundColor: '#007bff',
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                {fileItem.status !== 'success' && fileItem.status !== 'error' && (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Name *
                      </label>
                      <input
                        type="text"
                        value={data.name}
                        onChange={(e) => handleFormChange(fileItem.file.name, 'name', e.target.value)}
                        placeholder="Display name for this file"
                        required
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Description
                      </label>
                      <textarea
                        value={data.description}
                        onChange={(e) => handleFormChange(fileItem.file.name, 'description', e.target.value)}
                        placeholder="Optional description"
                        rows={3}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Location
                      </label>
                      <input
                        type="text"
                        value={data.location}
                        onChange={(e) => handleFormChange(fileItem.file.name, 'location', e.target.value)}
                        placeholder="e.g., Lake Michigan"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Fish Finder Brand *
                      </label>
                      <select
                        value={data.brand}
                        onChange={(e) => handleFormChange(fileItem.file.name, 'brand', e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      >
                        <option value="lowrance">Lowrance</option>
                        <option value="garmin">Garmin</option>
                        <option value="humminbird">Humminbird</option>
                        <option value="raymarine">Raymarine</option>
                        <option value="simrad">Simrad</option>
                        <option value="furuno">Furuno</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Upload All Button */}
          {hasFilesToUpload && (
            <div style={{ marginTop: '2rem' }}>
              <button
                onClick={uploadAllFiles}
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1.125rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Upload All Files
              </button>
            </div>
          )}

          {allUploaded && (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <p style={{ color: '#28a745', fontSize: '1.125rem', marginBottom: '1rem' }}>
                All files uploaded successfully!
              </p>
              <button
                onClick={() => navigate('/maps')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                View All Files
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
