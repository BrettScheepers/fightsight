'use client';

import { useState } from 'react';
import { VideoUploader } from '@/components/video/VideoUploader';
import { ProcessingStatus } from '@/components/video/ProcessingStatus';

export default function UploadPage() {
  const [uploadState, setUploadState] = useState<'idle' | 'processing'>('idle');
  const [videoId, setVideoId] = useState<string | null>(null);

  const handleUploadComplete = (id: string) => {
    setVideoId(id);
    setUploadState('processing');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Upload Sparring Video</h1>
          <p className="text-gray-600 mb-8">
            Upload your sparring video for AI-powered analysis
          </p>

          {uploadState === 'idle' && (
            <VideoUploader onUploadComplete={handleUploadComplete} />
          )}

          {uploadState === 'processing' && videoId && (
            <div>
              <ProcessingStatus videoId={videoId} />
              <button
                onClick={() => {
                  setUploadState('idle');
                  setVideoId(null);
                }}
                className="mt-6 w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Upload Another Video
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">Supported Formats</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• MP4, MOV, WEBM, AVI</li>
            <li>• Maximum file size: 500MB</li>
            <li>• Recommended: 720p or higher resolution</li>
            <li>• Combat sports: Boxing, Kickboxing, Muay Thai, MMA</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
