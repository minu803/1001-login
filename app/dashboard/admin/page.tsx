'use client'

export default function AdminDashboard() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ color: '#1a1a1a', marginBottom: '0.5rem', fontSize: '2.5rem' }}>👑 Admin Dashboard</h1>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Complete control panel for 1001 Stories platform management</p>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>156</h3>
            <p style={{ margin: '0', opacity: 0.9 }}>Total Users</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>89</h3>
            <p style={{ margin: '0', opacity: 0.9 }}>Published Stories</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>23</h3>
            <p style={{ margin: '0', opacity: 0.9 }}>Active Volunteers</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>12</h3>
            <p style={{ margin: '0', opacity: 0.9 }}>Pending Reviews</p>
          </div>
        </div>

        {/* Main Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem', marginRight: '1rem' }}>📚</span>
              <h3 style={{ color: '#1a1a1a', margin: '0' }}>Content Management</h3>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Review, approve, and manage all story submissions and content across the platform.</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Review Stories</button>
              <button style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Manage Categories</button>
            </div>
          </div>
          
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem', marginRight: '1rem' }}>👥</span>
              <h3 style={{ color: '#1a1a1a', margin: '0' }}>User Management</h3>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Manage user accounts, roles, permissions, and handle support requests.</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>View Users</button>
              <button style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Manage Roles</button>
            </div>
          </div>
          
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem', marginRight: '1rem' }}>📊</span>
              <h3 style={{ color: '#1a1a1a', margin: '0' }}>Analytics & Reports</h3>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Monitor platform performance, user engagement, and generate detailed reports.</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>View Analytics</button>
              <button style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Export Reports</button>
            </div>
          </div>

          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem', marginRight: '1rem' }}>⚙️</span>
              <h3 style={{ color: '#1a1a1a', margin: '0' }}>System Settings</h3>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Configure platform settings, security policies, and system preferences.</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>System Config</button>
              <button style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Security</button>
            </div>
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
