'use client'

export default function LearnerDashboard() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ color: '#1a1a1a', marginBottom: '0.5rem', fontSize: '2.5rem' }}>📚 My Learning Journey</h1>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Track your progress, access your books, and achieve your English learning goals</p>
        </div>

        {/* Progress & Motivation Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>📖</span>
              <h3 style={{ margin: '0', fontSize: '1.8rem' }}>5</h3>
            </div>
            <p style={{ margin: '0', opacity: 0.9 }}>Books Purchased</p>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '13px' }}>3 completed, 2 in progress</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>⏱️</span>
              <h3 style={{ margin: '0', fontSize: '1.8rem' }}>47h</h3>
            </div>
            <p style={{ margin: '0', opacity: 0.9 }}>Learning Hours</p>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '13px' }}>+2.5h this week</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>🔥</span>
              <h3 style={{ margin: '0', fontSize: '1.8rem' }}>12</h3>
            </div>
            <p style={{ margin: '0', opacity: 0.9 }}>Day Streak</p>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '13px' }}>Keep it up! 🎉</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>🏆</span>
              <h3 style={{ margin: '0', fontSize: '1.8rem' }}>8</h3>
            </div>
            <p style={{ margin: '0', opacity: 0.9 }}>Badges Earned</p>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '13px' }}>Next: "Speed Reader"</p>
          </div>
        </div>

        {/* Continue Learning - Priority Section */}
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem', borderRadius: '12px', marginBottom: '2rem', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>🎯 Continue Learning</h2>
              <p style={{ margin: '0 0 0.5rem 0', opacity: 0.9 }}>Chapter 7: "Advanced Conversations" • 15 min remaining</p>
              <p style={{ margin: '0', opacity: 0.8, fontSize: '14px' }}>From: "Business English Mastery"</p>
            </div>
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
              Resume Lesson →
            </button>
          </div>
        </div>

        {/* Main Content Areas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* My Library - Book Progress */}
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem', marginRight: '1rem' }}>📚</span>
              <h3 style={{ color: '#1a1a1a', margin: '0' }}>My Library</h3>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '8px', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#1e40af' }}>Business English Mastery</strong>
                  <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>IN PROGRESS</span>
                </div>
                <div style={{ background: '#e5e7eb', height: '6px', borderRadius: '3px', marginBottom: '0.5rem' }}>
                  <div style={{ background: '#3b82f6', height: '6px', borderRadius: '3px', width: '75%' }}></div>
                </div>
                <p style={{ margin: '0', color: '#6b7280', fontSize: '13px' }}>Chapter 7 of 10 • 75% complete</p>
              </div>
              <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#92400e' }}>Everyday Conversations</strong>
                  <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 'bold' }}>PAUSED</span>
                </div>
                <div style={{ background: '#e5e7eb', height: '6px', borderRadius: '3px', marginBottom: '0.5rem' }}>
                  <div style={{ background: '#f59e0b', height: '6px', borderRadius: '3px', width: '40%' }}></div>
                </div>
                <p style={{ margin: '0', color: '#92400e', fontSize: '13px' }}>Chapter 4 of 8 • 40% complete</p>
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
              View All Books
            </button>
          </div>

          {/* Achievement Badges */}
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem', marginRight: '1rem' }}>🏆</span>
              <h3 style={{ color: '#1a1a1a', margin: '0' }}>Achievement Badges</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#f0fdf4', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📖</div>
                <p style={{ margin: '0', color: '#166534', fontSize: '12px', fontWeight: 'bold' }}>FIRST BOOK</p>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔥</div>
                <p style={{ margin: '0', color: '#92400e', fontSize: '12px', fontWeight: 'bold' }}>WEEK STREAK</p>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#f0f9ff', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚡</div>
                <p style={{ margin: '0', color: '#1e40af', fontSize: '12px', fontWeight: 'bold' }}>QUICK LEARNER</p>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#fdf4ff', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
                <p style={{ margin: '0', color: '#7c2d92', fontSize: '12px', fontWeight: 'bold' }}>GOAL CRUSHER</p>
              </div>
            </div>
            <div style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', textAlign: 'center' }}>
              <p style={{ margin: '0', color: '#6b7280', fontSize: '13px' }}>🎉 Next Badge: <strong>"Speed Reader"</strong> - Complete next lesson</p>
            </div>
          </div>
          
          {/* Goal Setting & Motivation */}
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem', marginRight: '1rem' }}>⭐</span>
              <h3 style={{ color: '#1a1a1a', margin: '0' }}>Personal Goals</h3>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', marginBottom: '0.75rem', borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#166534' }}>October Goal</strong>
                  <span style={{ color: '#10b981', fontSize: '12px' }}>5 DAYS LEFT</span>
                </div>
                <p style={{ margin: '0 0 0.5rem 0', color: '#166534', fontSize: '14px' }}>Finish "Business English Mastery"</p>
                <div style={{ background: '#dcfce7', height: '6px', borderRadius: '3px' }}>
                  <div style={{ background: '#10b981', height: '6px', borderRadius: '3px', width: '75%' }}></div>
                </div>
              </div>
              <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                <strong style={{ color: '#92400e' }}>Daily Reminder</strong>
                <p style={{ margin: '0.5rem 0 0 0', color: '#92400e', fontSize: '14px' }}>"15 minutes of learning today keeps progress on track! 💪"</p>
              </div>
            </div>
            <button style={{ 
              background: '#8b5cf6', 
              color: 'white', 
              border: 'none', 
              padding: '0.75rem 1rem', 
              borderRadius: '8px', 
              width: '100%',
              fontSize: '16px', 
              cursor: 'pointer' 
            }}>
              Set New Goal
            </button>
          </div>
        </div>

        {/* Daily Motivation */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>💡</span>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#1a1a1a' }}>Word of the Day</h4>
              <p style={{ margin: '0', color: '#6b7280' }}>
                <strong style={{ color: '#3b82f6' }}>"Perseverance"</strong> - continued effort to do something despite difficulties. 
                <em style={{ color: '#10b981' }}>You're showing great perseverance in your learning journey!</em>
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
