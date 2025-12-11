import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'FightSight',
  description: 'AI-powered combat sports video analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
          <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 hover:text-red-600 transition-colors"
            >
              🥊 FightSight
            </Link>
            <Link
              href="/upload"
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Upload
            </Link>
          </nav>
        </header>
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  )
}
