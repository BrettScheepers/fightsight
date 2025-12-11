import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-2xl mx-auto text-center space-y-8">
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
    </main>
  );
}
