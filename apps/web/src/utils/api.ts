import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface FileMetadata {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_extension: string;
  display_name: string;
  description: string | null;
  location: string | null;
  brand: string;
  user_id: string;
  uploaded_at: string;
  download_count: number;
  view_count: number;
  user_profiles?: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

export interface UploadFileData {
  file: File;
  name: string;
  description?: string;
  location?: string;
  brand: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FilesListResponse {
  files: FileMetadata[];
  pagination: PaginationInfo;
}

/**
 * Get authentication token from Supabase
 */
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Upload a file to the API
 */
export async function uploadFile(
  data: UploadFileData,
  onProgress?: (progress: number) => void
): Promise<FileMetadata> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('You must be logged in to upload files');
  }

  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('name', data.name);
  if (data.description) formData.append('description', data.description);
  if (data.location) formData.append('location', data.location);
  formData.append('brand', data.brand);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        if (response.success) {
          resolve(response.file);
        } else {
          reject(new Error(response.error || 'Upload failed'));
        }
      } else {
        const response = JSON.parse(xhr.responseText);
        reject(new Error(response.error || 'Upload failed'));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error occurred'));
    });

    xhr.open('POST', `${API_BASE_URL}/api/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

/**
 * Get list of files with optional filtering and pagination
 */
export async function getFiles(params?: {
  page?: number;
  limit?: number;
  search?: string;
  brand?: string;
}): Promise<FilesListResponse> {
  const queryParams = new URLSearchParams();

  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.brand) queryParams.append('brand', params.brand);

  const url = `${API_BASE_URL}/api/files?${queryParams.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch files');
  }

  return response.json();
}

/**
 * Get single file metadata by ID
 */
export async function getFile(fileId: string): Promise<FileMetadata> {
  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch file');
  }

  const data = await response.json();
  return data.file;
}

/**
 * Download a file
 */
export async function downloadFile(fileId: string, filename: string): Promise<void> {
  const url = `${API_BASE_URL}/api/download/${fileId}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Download failed');
  }

  // Create blob from response
  const blob = await response.blob();

  // Create download link and trigger download
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Delete a file
 */
export async function deleteFile(fileId: string): Promise<void> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('You must be logged in to delete files');
  }

  const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete file');
  }
}

/**
 * Format file size to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 7) {
    return past.toLocaleDateString();
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}
