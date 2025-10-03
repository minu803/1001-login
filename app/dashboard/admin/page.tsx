'use client'

export default function AdminDashboard() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ color: '#1a1a1a', marginBottom: '1rem' }}>👑 Admin Dashboard</h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Welcome to the admin control panel for 1001 Stories.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ color: '#1a1a1a', marginBottom: '0.5rem' }}>📚 Content Management</h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Manage stories, approve submissions, and organize content.</p>
          </div>
          
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ color: '#1a1a1a', marginBottom: '0.5rem' }}>👥 User Management</h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Manage users, volunteers, and permissions.</p>
          </div>
          
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ color: '#1a1a1a', marginBottom: '0.5rem' }}>📊 Analytics</h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>View platform statistics and user engagement.</p>
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
