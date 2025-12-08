'use client';

import { useState } from 'react';
import { requestUploadUrl, uploadVideo, createAnalysisJob } from '@/lib/upload-client';

interface VideoUploaderProps {
  onUploadComplete: (videoId: string) => void;
}

export function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    // Validate file size (500MB max)
    const maxSize = 500 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 500MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setProgress(0);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: Request upload URL
      const uploadData = await requestUploadUrl(file.name, file.type, {
        size: file.size,
      });

      // Step 2: Upload to storage
      await uploadVideo(uploadData.uploadUrl, file, (progressValue) => {
        setProgress(Math.round(progressValue));
      });

      // Step 3: Create analysis job
      const jobData = await createAnalysisJob(uploadData.fileName, {
        size: file.size,
        contentType: file.type,
        sportType: 'boxing', // Default for now
      });

      // Success!
      onUploadComplete(jobData.videoId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          type="file"
          accept="video/mp4,video/mov,video/webm,video/avi"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
          id="video-upload"
        />
        <label
          htmlFor="video-upload"
          className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="space-y-2">
            <div className="text-4xl">📹</div>
            <div className="text-lg font-medium">
              {file ? file.name : 'Select a video file'}
            </div>
            <div className="text-sm text-gray-500">
              MP4, MOV, WEBM, or AVI (max 500MB)
            </div>
          </div>
        </label>
      </div>

      {file && !isUploading && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            File: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </div>
          <button
            onClick={handleUpload}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Upload and Analyze
          </button>
        </div>
      )}

      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
