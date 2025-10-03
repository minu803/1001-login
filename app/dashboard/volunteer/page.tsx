'use client'

export default function VolunteerDashboard() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ color: '#1a1a1a', marginBottom: '0.5rem', fontSize: '2.5rem' }}>✍️ Volunteer Content Hub</h1>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Create, manage, and track your story contributions to help learners worldwide</p>
        </div>

        {/* Performance Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>📝</span>
              <h3 style={{ margin: '0', fontSize: '1.8rem' }}>23</h3>
            </div>
            <p style={{ margin: '0', opacity: 0.9 }}>Stories Submitted</p>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '13px' }}>18 approved, 2 pending</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>👥</span>
              <h3 style={{ margin: '0', fontSize: '1.8rem' }}>1,247</h3>
            </div>
            <p style={{ margin: '0', opacity: 0.9 }}>Learners Reached</p>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '13px' }}>+89 this month</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>❤️</span>
              <h3 style={{ margin: '0', fontSize: '1.8rem' }}>94%</h3>
            </div>
            <p style={{ margin: '0', opacity: 0.9 }}>Approval Rate</p>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '13px' }}>Above average!</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>⭐</span>
              <h3 style={{ margin: '0', fontSize: '1.8rem' }}>4.8</h3>
            </div>
            <p style={{ margin: '0', opacity: 0.9 }}>Avg. Rating</p>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '13px' }}>From 156 reviews</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem', borderRadius: '12px', marginBottom: '2rem', color: 'white' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>📤 Quick Actions</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button style={{ 
              background: 'white', 
              color: '#667eea', 
              border: 'none', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '8px', 
              fontSize: '16px', 
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              ✏️ Write New Story
            </button>
            <button style={{ 
              background: 'rgba(255,255,255,0.2)', 
              color: 'white', 
              border: '2px solid white', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '8px', 
              fontSize: '16px', 
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>
              📋 View Submissions
            </button>
            <button style={{ 
              background: 'rgba(255,255,255,0.2)', 
              color: 'white', 
              border: '2px solid white', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '8px', 
              fontSize: '16px', 
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>
              📊 Impact Report
            </button>
          </div>
        </div>

        {/* Main Content Areas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* Submission Tracker */}
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '2rem', marginRight: '1rem' }}>📤</span>
                <h3 style={{ color: '#1a1a1a', margin: '0' }}>Submission Status</h3>
              </div>
              <span style={{ background: '#f3f4f6', color: '#374151', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                2 PENDING REVIEW
              </span>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px', marginBottom: '0.75rem', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#92400e' }}>The Magical Garden</strong>
                  <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 'bold' }}>UNDER REVIEW</span>
                </div>
                <p style={{ margin: '0', color: '#92400e', fontSize: '13px' }}>Submitted 3 days ago • Children's Fiction</p>
              </div>
              <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', marginBottom: '0.75rem', borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#166534' }}>Business Meeting Basics</strong>
                  <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>APPROVED</span>
                </div>
                <p style={{ margin: '0', color: '#166534', fontSize: '13px' }}>Published 1 week ago • 47 learners reading</p>
              </div>
              <div style={{ padding: '1rem', background: '#fecaca', borderRadius: '8px', marginBottom: '0.75rem', borderLeft: '4px solid #ef4444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#dc2626' }}>Travel Adventures</strong>
                  <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold' }}>NEEDS REVISION</span>
                </div>
                <p style={{ margin: '0', color: '#dc2626', fontSize: '13px' }}>Review feedback available • Click to revise</p>
              </div>
            </div>
            <button style={{ 
              background: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              padding: '0.75rem 1rem', 
              borderRadius: '8px', 
              width: '100%',
              fontSize: '16px', 
              cursor: 'pointer' 
            }}>
              View All Submissions
            </button>
          </div>

          {/* Story Performance */}
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem', marginRight: '1rem' }}>📈</span>
              <h3 style={{ color: '#1a1a1a', margin: '0' }}>Top Performing Stories</h3>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#1e40af' }}>Weekend Plans</strong>
                  <span style={{ background: '#3b82f6', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '11px' }}>
                    #1 THIS WEEK
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', color: '#6b7280', fontSize: '13px' }}>
                  <span>👥 89 readers</span>
                  <span>❤️ 4.9★</span>
                  <span>⏱️ 94% completion</span>
                </div>
              </div>
              <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#166534' }}>Job Interview Tips</strong>
                  <span style={{ background: '#10b981', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '11px' }}>
                    TRENDING
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', color: '#6b7280', fontSize: '13px' }}>
                  <span>👥 156 readers</span>
                  <span>❤️ 4.7★</span>
                  <span>⏱️ 87% completion</span>
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: '0', color: '#6b7280', fontSize: '13px' }}>
                💡 <strong>Tip:</strong> Stories with dialogue examples get 40% higher engagement!
              </p>
            </div>
          </div>
          
          {/* Contributor Milestones */}
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem', marginRight: '1rem' }}>🏅</span>
              <h3 style={{ color: '#1a1a1a', margin: '0' }}>Achievements</h3>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ textAlign: 'center', padding: '1rem', background: '#f0fdf4', borderRadius: '8px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌟</div>
                  <p style={{ margin: '0', color: '#166534', fontSize: '12px', fontWeight: 'bold' }}>QUALITY WRITER</p>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '11px' }}>90%+ approval rate</p>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔥</div>
                  <p style={{ margin: '0', color: '#92400e', fontSize: '12px', fontWeight: 'bold' }}>PROLIFIC</p>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '11px' }}>20+ stories</p>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', background: '#f0f9ff', borderRadius: '8px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                  <p style={{ margin: '0', color: '#1e40af', fontSize: '12px', fontWeight: 'bold' }}>POPULAR</p>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '11px' }}>1000+ readers</p>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', background: '#fdf4ff', borderRadius: '8px', border: '2px dashed #a855f7' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
                  <p style={{ margin: '0', color: '#7c2d92', fontSize: '12px', fontWeight: 'bold' }}>MENTOR</p>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '11px' }}>2 more stories</p>
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                <p style={{ margin: '0', color: '#6b7280', fontSize: '13px' }}>
                  🎉 <strong>Impact:</strong> Your stories have helped 1,247 learners improve their English!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Panel */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>🔔</span>
            <h4 style={{ margin: '0', color: '#1a1a1a' }}>Recent Updates</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ padding: '0.75rem', background: '#f0f9ff', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
              <p style={{ margin: '0', color: '#1e40af', fontSize: '14px' }}>
                <strong>"Business Meeting Basics"</strong> received 5 new positive reviews today! 🌟
              </p>
            </div>
            <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>
              <p style={{ margin: '0', color: '#92400e', fontSize: '14px' }}>
                Review feedback available for <strong>"Travel Adventures"</strong> - minor edits needed
              </p>
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
