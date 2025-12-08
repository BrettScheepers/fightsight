/**
 * Upload API Client
 * Handles video upload flow using native fetch API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface UploadUrlResponse {
  uploadUrl: string;
  fileName: string;
  expiresAt: string;
}

export interface VideoAnalysisResponse {
  videoId: string;
  analysisSessionId: string;
  status: string;
}

/**
 * Step 1: Request a presigned upload URL from the API
 */
export async function requestUploadUrl(
  fileName: string,
  contentType: string,
  metadata?: Record<string, any>
): Promise<UploadUrlResponse> {
  const response = await fetch(`${API_BASE_URL}/api/storage/request-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName,
      contentType,
      metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Upload URL request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Step 2: Upload video file to the presigned URL
 */
export async function uploadVideo(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  // Use XMLHttpRequest for progress tracking
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
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('file', file);

    xhr.open('PUT', uploadUrl);
    // Don't set Content-Type - browser will set it with boundary for multipart
    xhr.send(formData);
  });
}

/**
 * Step 3: Create analysis job for the uploaded video
 */
export async function createAnalysisJob(
  fileName: string,
  metadata?: Record<string, any>
): Promise<VideoAnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}/api/videos/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName,
      metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Analysis job creation failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get video status
 */
export async function getVideoStatus(videoId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/videos/${videoId}/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to get video status: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get analysis results
 */
export async function getAnalysisResults(videoId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/videos/${videoId}/analysis`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to get analysis results: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}
