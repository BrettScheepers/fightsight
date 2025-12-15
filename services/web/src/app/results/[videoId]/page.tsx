'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface StrikeEvent {
  id: string;
  timestampSeconds: number;
  frameNumber: number;
  roundNumber: number;
  technique: string;
  strikeCategory: string;
  targetZone: string;
  outcome: string;
  detectionConfidence: number;
  classificationConfidence: number;
  thrower: {
    displayName: string;
    fighterLabel: string;
  };
  receiver: {
    displayName: string;
    fighterLabel: string;
  };
}

interface SessionFighter {
  id: string;
  fighterLabel: string;
  displayName: string;
  cornerColor: string;
  stance: string;
  totalStrikesThrown: number;
  totalStrikesLanded: number;
  totalStrikesReceived: number;
}

interface AnalysisSession {
  id: string;
  status: string;
  sportType: string;
  startedAt: string;
  completedAt: string;
  totalStrikesDetected: number;
  processingTimeSeconds: number;
  strikeEvents: StrikeEvent[];
  sessionFighters: SessionFighter[];
}

interface Video {
  id: string;
  originalFilename: string;
  storagePath: string;
  durationSeconds: number;
}

interface AnalysisData {
  videoId: string;
  video: Video;
  analysisSession: AnalysisSession;
}

export default function ResultsPage() {
  const params = useParams();
  const videoId = params.videoId as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeStrikeRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeStrikeId, setActiveStrikeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        console.log('API URL:', apiUrl);
        const response = await fetch(
          `${apiUrl}/api/videos/${videoId}/analysis`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch analysis');
        }

        const result = await response.json();
        console.log('Video data:', result.data.video);
        console.log('Video URL will be:', `${apiUrl}/api/storage/files/${result.data.video.storagePath}`);
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [videoId]);

  // Track video playback and highlight current strike
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !data) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);

      // Find the strike at current time (within 0.5 second window)
      const currentStrike = data.analysisSession.strikeEvents.find(
        (strike) =>
          Math.abs(parseFloat(strike.timestampSeconds.toString()) - time) < 0.5
      );

      setActiveStrikeId(currentStrike?.id || null);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [data]);

  // Auto-scroll to active strike
  useEffect(() => {
    if (activeStrikeId && activeStrikeRef.current) {
      activeStrikeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeStrikeId]);

  const jumpToTimestamp = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      videoRef.current.play();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'landed_clean':
        return 'text-green-600 bg-green-50';
      case 'partially_landed':
        return 'text-yellow-600 bg-yellow-50';
      case 'blocked':
      case 'parried':
        return 'text-blue-600 bg-blue-50';
      case 'slipped':
      case 'rolled':
        return 'text-purple-600 bg-purple-50';
      case 'missed':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

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

  const totalStrikes = data.analysisSession.strikeEvents.length;
  const strikesByType: Record<string, number> = {};

  data.analysisSession.strikeEvents.forEach((strike) => {
    const type = strike.technique;
    strikesByType[type] = (strikesByType[type] || 0) + 1;
  });

  const sortedStrikes = Object.entries(strikesByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-gray-900">Analysis Complete</h1>
          <p className="text-gray-600 mt-2">{data.video.originalFilename}</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-red-600">{totalStrikes}</div>
            <div className="text-sm text-gray-600 mt-1">Total Strikes</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {formatTime(parseFloat(data.video.durationSeconds.toString()))}
            </div>
            <div className="text-sm text-gray-600 mt-1">Duration</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-green-600">
              {data.analysisSession.sessionFighters.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Fighters</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {Math.round((totalStrikes / parseFloat(data.video.durationSeconds.toString())) * 60)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Strikes/Min</div>
          </div>
        </div>

        {/* Video Player + Strikes Table (Side by Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Player */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Video Playback</h2>
            <div className="bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full"
                controls
                playsInline
                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/storage/files/${data.video.storagePath}`}
                onError={(e) => {
                  console.error('Video error:', e);
                  console.error('Video src:', videoRef.current?.src);
                  console.error('Video error code:', videoRef.current?.error?.code);
                  console.error('Video error message:', videoRef.current?.error?.message);
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Click any strike in the table to jump to that moment →
            </div>
          </div>

          {/* Detailed Strikes Table */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-center">Strike Timeline ({totalStrikes})</h2>

            {/* Fighter Headers */}
            <div className="grid grid-cols-[80px_1fr_1fr] gap-2 mb-4 pb-2 border-b-2 border-gray-200">
              <div className="px-2"></div>
              <div className="text-sm font-bold text-red-600 px-2">
                {data.analysisSession.sessionFighters.find(f => f.fighterLabel === 'fighter_a')?.displayName || 'Fighter A'}
              </div>
              <div className="text-sm font-bold text-blue-600 px-2">
                {data.analysisSession.sessionFighters.find(f => f.fighterLabel === 'fighter_b')?.displayName || 'Fighter B'}
              </div>
            </div>

            {/* Strikes Timeline */}
            <div className="max-h-[400px] overflow-y-auto space-y-1">
              {data.analysisSession.strikeEvents
                .sort((a, b) => parseFloat(a.timestampSeconds.toString()) - parseFloat(b.timestampSeconds.toString()))
                .map((strike) => {
                  const isActive = strike.id === activeStrikeId;
                  const isFighterA = strike.thrower.fighterLabel === 'fighter_a';

                  return (
                    <div
                      key={strike.id}
                      ref={isActive ? activeStrikeRef : null}
                      className={`grid grid-cols-[80px_1fr_1fr] gap-2 py-2 px-2 rounded cursor-pointer transition-colors hover:bg-gray-50 ${
                        isActive ? 'bg-gray-100 border-l-2 border-gray-400' : ''
                      }`}
                      onClick={() => jumpToTimestamp(parseFloat(strike.timestampSeconds.toString()))}
                    >
                      {/* Timestamp */}
                      <div className="font-mono text-xs text-blue-600 flex items-center">
                        {formatTime(parseFloat(strike.timestampSeconds.toString()))}
                      </div>

                      {/* Fighter A Column */}
                      <div className={`text-sm flex items-center ${!isFighterA ? 'opacity-0' : ''}`}>
                        {isFighterA && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">
                              {strike.technique.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-gray-600 capitalize">→ {strike.targetZone}</span>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs ${getOutcomeColor(
                                strike.outcome
                              )}`}
                            >
                              {strike.outcome.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Fighter B Column */}
                      <div className={`text-sm flex items-center ${isFighterA ? 'opacity-0' : ''}`}>
                        {!isFighterA && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">
                              {strike.technique.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-gray-600 capitalize">→ {strike.targetZone}</span>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs ${getOutcomeColor(
                                strike.outcome
                              )}`}
                            >
                              {strike.outcome.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Strike Type Breakdown */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Top Techniques</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sortedStrikes.map(([type, count]) => {
              const percentage = ((count / totalStrikes) * 100).toFixed(1);
              return (
                <div key={type}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-gray-700 capitalize">
                      {type.replace('_', ' ')}
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
              );
            })}
          </div>
        </div>

        {/* Fighter Stats */}
        {data.analysisSession.sessionFighters.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Fighter Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.analysisSession.sessionFighters.map((fighter) => (
                <div key={fighter.id} className="border rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-3">{fighter.displayName}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stance:</span>
                      <span className="font-medium capitalize">{fighter.stance}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Strikes Thrown:</span>
                      <span className="font-medium">{fighter.totalStrikesThrown}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Strikes Landed:</span>
                      <span className="font-medium text-green-600">{fighter.totalStrikesLanded}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Strikes Received:</span>
                      <span className="font-medium text-red-600">{fighter.totalStrikesReceived}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Accuracy:</span>
                      <span className="font-medium">
                        {fighter.totalStrikesThrown > 0
                          ? Math.round((fighter.totalStrikesLanded / fighter.totalStrikesThrown) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
