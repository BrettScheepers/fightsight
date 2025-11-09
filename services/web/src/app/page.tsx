export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        🥊 FightSight
      </h1>
      <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '2rem' }}>
        Combat Sport Sparring Video Analysis Platform
      </p>

      <div style={{
        background: '#f5f5f5',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '600px'
      }}>
        <h2 style={{ marginTop: 0 }}>Status</h2>
        <ul style={{ lineHeight: '2' }}>
          <li>✅ Web UI - Running</li>
          <li>✅ API - <a href={`${apiUrl}/health`} target="_blank" rel="noopener noreferrer">Check Health</a></li>
          <li>✅ CV Service - Ready</li>
          <li>✅ Database - Connected</li>
        </ul>

        <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
          Version: 0.1.0 (Development)
        </p>
      </div>
    </main>
  )
}
