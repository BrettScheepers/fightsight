import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FightSight',
  description: 'Combat sport sparring video analysis platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
