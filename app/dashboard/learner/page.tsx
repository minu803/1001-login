'use client'

export default function LearnerDashboard() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ color: '#1a1a1a', marginBottom: '1rem' }}>📚 Student Dashboard</h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Welcome to your learning space at 1001 Stories.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ color: '#1a1a1a', marginBottom: '0.5rem' }}>📖 My Library</h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Browse and read stories from around the world.</p>
          </div>
          
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ color: '#1a1a1a', marginBottom: '0.5rem' }}>✏️ Write Stories</h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Create and share your own amazing stories.</p>
          </div>
          
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ color: '#1a1a1a', marginBottom: '0.5rem' }}>🏆 Achievements</h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Track your progress and celebrate milestones.</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="/" style={{ 
            color: '#10b981', 
            textDecoration: 'underline',
            fontSize: '14px'
          }}>
            ← Back to Home
          </a>
          <button onClick={() => {
            fetch('/api/auth/signout', { method: 'POST' })
              .then(() => window.location.href = '/')
          }} style={{
            background: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
