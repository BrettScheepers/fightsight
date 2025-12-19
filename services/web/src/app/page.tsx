'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { startAnalysis, deleteVideo } from '@/lib/upload-client';

interface Video {
  id: string;
  originalFilename: string;
  createdAt: string;
  analysisSessions: Array<{
    status: string;
    completedAt: string | null;
    totalStrikesDetected: number;
  }>;
}

export default function Home() {
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingVideos, setAnalyzingVideos] = useState<Set<string>>(new Set());
  const [deletingVideos, setDeletingVideos] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchRecentVideos = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/videos/recent`);

        if (response.ok) {
          const result = await response.json();
          setRecentVideos(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch recent videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentVideos();
  }, []);

  const handleStartAnalysis = async (videoId: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();

    setAnalyzingVideos(prev => new Set(prev).add(videoId));

    try {
      await startAnalysis(videoId);
      // Refresh videos list
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/videos/recent`);
      if (response.ok) {
        const result = await response.json();
        setRecentVideos(result.data || []);
      }
    } catch (error) {
      console.error('Failed to start analysis:', error);
      alert('Failed to start analysis. Please try again.');
    } finally {
      setAnalyzingVideos(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  const handleDeleteVideo = async (videoId: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    setDeletingVideos(prev => new Set(prev).add(videoId));

    try {
      await deleteVideo(videoId);
      // Remove from local state
      setRecentVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (error) {
      console.error('Failed to delete video:', error);
      alert('Failed to delete video. Please try again.');
    } finally {
      setDeletingVideos(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  return (
    <main className="min-h-screen px-4 py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Hero Section - Only show if no videos */}
        {!loading && recentVideos.length === 0 && (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                AI-Powered Sparring Analysis
              </h1>
              <p className="text-xl text-gray-600">
                Upload your combat sports video and get instant feedback on strikes, technique, and performance
              </p>
            </div>

            <Link
              href="/upload"
              className="inline-block bg-red-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-red-700 transition-colors"
            >
              Upload Your First Video
            </Link>

            <div className="pt-8">
              <ul className="space-y-3 text-left max-w-md mx-auto text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Detect strikes automatically</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Track performance metrics</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Get actionable feedback</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Recent Analyses Section */}
        {!loading && recentVideos.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Analyses</h2>
            <div className="space-y-4">
              {recentVideos.map((video) => {
                const latestSession = video.analysisSessions[0];
                const isCompleted = latestSession?.status === 'completed';
                const isPending = latestSession?.status === 'pending';
                const isAnalyzing = analyzingVideos.has(video.id);
                const isDeleting = deletingVideos.has(video.id);

                return (
                  <div key={video.id} className="p-4 border border-gray-200 rounded-lg hover:border-red-600 transition-colors">
                    <Link
                      href={isCompleted ? `/results/${video.id}` : `/upload?videoId=${video.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{video.originalFilename}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>
                              {new Date(video.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {isCompleted && latestSession && (
                              <span className="text-green-600 font-medium">
                                {latestSession.totalStrikesDetected} strikes detected
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded">
                              Completed
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded">
                              {latestSession?.status || 'Pending'}
                            </span>
                          )}
                          <span className="text-gray-400">→</span>
                        </div>
                      </div>
                    </Link>
                    <div className="flex gap-2 mt-3">
                      {isPending && (
                        <button
                          onClick={(e) => handleStartAnalysis(video.id, e)}
                          disabled={isAnalyzing || isDeleting}
                          className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {isAnalyzing ? 'Starting...' : 'Start Analysis'}
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteVideo(video.id, e)}
                        disabled={isDeleting}
                        className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-red-100 hover:text-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
