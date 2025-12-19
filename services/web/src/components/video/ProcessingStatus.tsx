'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getVideoStatus, startAnalysis } from '@/lib/upload-client';

interface ProcessingStatusProps {
  videoId: string;
}

export function ProcessingStatus({ videoId }: ProcessingStatusProps) {
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const statusData = await getVideoStatus(videoId);
        setStatus(statusData);

        // If completed, redirect to results page
        if (statusData.analysisStatus === 'completed') {
          router.push(`/results/${videoId}`);
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
        return 'text-red-600';
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

  const handleStartAnalysis = async () => {
    setIsStartingAnalysis(true);
    setError(null);

    try {
      await startAnalysis(videoId);
      // Refresh status immediately
      const statusData = await getVideoStatus(videoId);
      setStatus(statusData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start analysis';
      setError(message);
    } finally {
      setIsStartingAnalysis(false);
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

      {status.analysisStatus === 'pending' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-center">
            Video uploaded successfully! Click below to start analysis.
          </div>
          <button
            onClick={handleStartAnalysis}
            disabled={isStartingAnalysis}
            className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStartingAnalysis ? 'Starting Analysis...' : 'Start Analysis'}
          </button>
        </div>
      )}

      {status.analysisStatus === 'processing' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Processing video...</span>
            <span>{status.progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-600 h-2 rounded-full transition-all duration-300"
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
