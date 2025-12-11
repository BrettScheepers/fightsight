'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface StrikeEvent {
  id: string;
  strikeType: string;
  confidence: number;
  timestampSeconds: number;
}

interface AnalysisSession {
  id: string;
  status: string;
  strikeEvents: StrikeEvent[];
  startedAt: string;
  completedAt: string;
}

interface AnalysisData {
  videoId: string;
  analysisSession: AnalysisSession;
}

export default function ResultsPage() {
  const params = useParams();
  const videoId = params.videoId as string;

  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/videos/${videoId}/analysis`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch analysis');
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [videoId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <div className="text-xl text-gray-600">Loading analysis...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <h2 className="text-xl font-bold mb-2">Error Loading Analysis</h2>
            <p>{error || 'Analysis data not found'}</p>
          </div>
          <Link
            href="/upload"
            className="mt-6 block w-full bg-red-600 text-white text-center py-3 px-6 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Upload Another Video
          </Link>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalStrikes = data.analysisSession.strikeEvents.length;

  // Group strikes by type
  const strikesByType: Record<string, number> = {};
  data.analysisSession.strikeEvents.forEach((strike) => {
    const type = strike.strikeType || 'Unknown';
    strikesByType[type] = (strikesByType[type] || 0) + 1;
  });

  // Sort by count
  const sortedStrikes = Object.entries(strikesByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10); // Top 10 strike types

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Success Header */}
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-gray-900">Analysis Complete</h1>
          <p className="text-gray-600 mt-2">Your sparring video has been analyzed</p>
        </div>

        {/* Overview Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            📊 Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-4xl font-bold text-red-600">{totalStrikes}</div>
              <div className="text-sm text-gray-600 mt-1">Total Strikes Detected</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-4xl font-bold text-green-600">{sortedStrikes.length}</div>
              <div className="text-sm text-gray-600 mt-1">Different Strike Types</div>
            </div>
          </div>
        </div>

        {/* Strike Breakdown Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            🎯 Strike Breakdown
          </h2>
          {sortedStrikes.length > 0 ? (
            <div className="space-y-3">
              {sortedStrikes.map(([type, count]) => {
                const percentage = ((count / totalStrikes) * 100).toFixed(1);
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-700 capitalize">
                          {type}
                        </span>
                        <span className="text-gray-600">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">
              No strikes detected in this video.
            </p>
          )}
        </div>

        {/* CTA */}
        <Link
          href="/upload"
          className="block w-full bg-red-600 text-white text-center py-3 px-6 rounded-lg font-medium hover:bg-red-700 transition-colors"
        >
          Upload Another Video
        </Link>
      </div>
    </div>
  );
}
