'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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

                return (
                  <Link
                    key={video.id}
                    href={isCompleted ? `/results/${video.id}` : `/upload?videoId=${video.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-red-600 hover:bg-gray-50 transition-colors"
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
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
