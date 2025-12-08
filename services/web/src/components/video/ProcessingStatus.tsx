'use client';

import { useEffect, useState } from 'react';
import { getVideoStatus } from '@/lib/upload-client';

interface ProcessingStatusProps {
  videoId: string;
}

export function ProcessingStatus({ videoId }: ProcessingStatusProps) {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const statusData = await getVideoStatus(videoId);
        setStatus(statusData);

        // If completed, redirect to results page (you can customize this)
        if (statusData.analysisStatus === 'completed') {
          // TODO: Redirect to results page
          console.log('Analysis complete!', statusData);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch status';
        setError(message);
      }
    };

    // Fetch immediately
    fetchStatus();

    // Poll every 3 seconds if processing
    const interval = setInterval(() => {
      if (status?.analysisStatus !== 'completed' && status?.analysisStatus !== 'failed') {
        fetchStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [videoId, status?.analysisStatus]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-8">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const getStatusColor = () => {
    switch (status.analysisStatus) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'processing':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (status.analysisStatus) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'processing':
        return '⚙️';
      default:
        return '⏳';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-4">{getStatusIcon()}</div>
        <h2 className={`text-2xl font-bold ${getStatusColor()}`}>
          {status.analysisStatus.charAt(0).toUpperCase() + status.analysisStatus.slice(1)}
        </h2>
      </div>

      {status.analysisStatus === 'processing' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Processing video...</span>
            <span>{status.progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${status.progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {status.analysisStatus === 'failed' && status.errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {status.errorMessage}
        </div>
      )}

      {status.analysisStatus === 'completed' && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          Analysis complete! Your video has been processed.
        </div>
      )}

      <div className="text-sm text-gray-500 text-center">
        Video ID: {videoId}
      </div>
    </div>
  );
}
