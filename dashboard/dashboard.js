// Dashboard Management System
class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'overview';
        this.init();
    }

    async init() {
        await this.checkAuthAndRedirect();
        this.setupEventListeners();
        this.loadUserProfile();
        this.setupNavigation();
        this.loadDashboardContent();
    }

    async checkAuthAndRedirect() {
        try {
            const session = await window.mockSessionManager.getSession();
            if (!session || !session.user) {
                // Not authenticated, redirect to home
                window.location.href = '../index.html';
                return;
            }
            this.currentUser = session.user;
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '../index.html';
        }
    }

    setupEventListeners() {
        // Handle URL parameters for specific dashboard routes
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page') || 'overview';
        this.currentPage = page;
    }

    loadUserProfile() {
        if (!this.currentUser) return;

        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        const userAvatar = document.querySelector('.user-avatar');

        if (userName) userName.textContent = this.currentUser.name || this.currentUser.email;
        if (userRole) userRole.textContent = this.currentUser.role;
        if (userAvatar) {
            const initials = (this.currentUser.name || this.currentUser.email)
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
            userAvatar.textContent = initials;
        }
    }

    setupNavigation() {
        if (!this.currentUser) return;

        const sidebarNav = document.getElementById('sidebarNav');
        const pageTitle = document.getElementById('pageTitle');
        
        const navigation = this.getNavigationForRole(this.currentUser.role);
        
        sidebarNav.innerHTML = navigation.map(section => `
            <div class="nav-section">
                ${section.title ? `<div class="nav-section-title">${section.title}</div>` : ''}
                ${section.items.map(item => `
                    <button class="nav-item ${this.currentPage === item.key ? 'active' : ''}" 
                            onclick="dashboardManager.navigateTo('${item.key}')">
                        <span class="icon">${item.icon}</span>
                        <span class="label">${item.label}</span>
                        ${item.count ? `<span class="count">${item.count}</span>` : ''}
                    </button>
                `).join('')}
            </div>
        `).join('');

        // Update page title
        const currentPageInfo = this.getCurrentPageInfo();
        if (pageTitle) pageTitle.textContent = currentPageInfo.title;
    }

    getNavigationForRole(role) {
        const baseNav = [
            {
                title: 'Main',
                items: [
                    { key: 'overview', label: 'Overview', icon: '📊' },
                    { key: 'profile', label: 'Profile', icon: '👤' }
                ]
            }
        ];

        const roleSpecificNav = {
            'ADMIN': [
                {
                    title: 'Administration',
                    items: [
                        { key: 'users', label: 'User Management', icon: '👥', count: 1247 },
                        { key: 'content', label: 'Content Management', icon: '📚', count: 89 },
                        { key: 'analytics', label: 'Analytics', icon: '📈' },
                        { key: 'settings', label: 'System Settings', icon: '⚙️' }
                    ]
                },
                {
                    title: 'Security',
                    items: [
                        { key: 'audit', label: 'Audit Logs', icon: '🔍' },
                        { key: 'permissions', label: 'Permissions', icon: '🔐' }
                    ]
                }
            ],
            'VOLUNTEER': [
                {
                    title: 'Content',
                    items: [
                        { key: 'projects', label: 'My Projects', icon: '📝', count: 5 },
                        { key: 'review', label: 'Content Review', icon: '✅', count: 12 },
                        { key: 'translate', label: 'Translation', icon: '🌍', count: 3 }
                    ]
                },
                {
                    title: 'Community',
                    items: [
                        { key: 'mentoring', label: 'Mentoring', icon: '🤝', count: 8 },
                        { key: 'events', label: 'Events', icon: '📅' }
                    ]
                }
            ],
            'TEACHER': [
                {
                    title: 'Classroom',
                    items: [
                        { key: 'classes', label: 'My Classes', icon: '🎓', count: 3 },
                        { key: 'students', label: 'Students', icon: '👨‍🎓', count: 67 },
                        { key: 'assignments', label: 'Assignments', icon: '📋', count: 15 }
                    ]
                },
                {
                    title: 'Resources',
                    items: [
                        { key: 'library', label: 'Teaching Library', icon: '📚' },
                        { key: 'progress', label: 'Progress Tracking', icon: '📊' }
                    ]
                }
            ],
            'LEARNER': [
                {
                    title: 'Learning',
                    items: [
                        { key: 'library', label: 'My Library', icon: '📚', count: 23 },
                        { key: 'reading', label: 'Continue Reading', icon: '📖', count: 2 },
                        { key: 'writing', label: 'My Stories', icon: '✍️', count: 5 }
                    ]
                },
                {
                    title: 'Progress',
                    items: [
                        { key: 'achievements', label: 'Achievements', icon: '🏆', count: 12 },
                        { key: 'certificates', label: 'Certificates', icon: '🎖️', count: 3 }
                    ]
                }
            ],
            'INSTITUTION': [
                {
                    title: 'Management',
                    items: [
                        { key: 'overview', label: 'Institution Overview', icon: '🏫' },
                        { key: 'teachers', label: 'Teachers', icon: '👨‍🏫', count: 15 },
                        { key: 'students', label: 'Students', icon: '👨‍🎓', count: 342 }
                    ]
                },
                {
                    title: 'Administration',
                    items: [
                        { key: 'billing', label: 'Billing', icon: '💳' },
                        { key: 'reports', label: 'Reports', icon: '📊' }
                    ]
                }
            ]
        };

        return [...baseNav, ...(roleSpecificNav[role] || [])];
    }

    navigateTo(page) {
        this.currentPage = page;
        // Update URL without reload
        const url = new URL(window.location);
        url.searchParams.set('page', page);
        window.history.pushState({}, '', url);
        
        this.setupNavigation(); // Update active states
        this.loadDashboardContent();
    }

    getCurrentPageInfo() {
        const pageInfo = {
            'overview': { title: 'Dashboard Overview' },
            'profile': { title: 'My Profile' },
            'users': { title: 'User Management' },
            'content': { title: 'Content Management' },
            'analytics': { title: 'Analytics' },
            'settings': { title: 'System Settings' },
            'audit': { title: 'Audit Logs' },
            'permissions': { title: 'Permissions' },
            'projects': { title: 'My Projects' },
            'review': { title: 'Content Review' },
            'translate': { title: 'Translation Tasks' },
            'mentoring': { title: 'Mentoring' },
            'events': { title: 'Events' },
            'classes': { title: 'My Classes' },
            'students': { title: 'Students' },
            'assignments': { title: 'Assignments' },
            'library': { title: 'Library' },
            'progress': { title: 'Progress Tracking' },
            'reading': { title: 'Continue Reading' },
            'writing': { title: 'My Stories' },
            'achievements': { title: 'Achievements' },
            'certificates': { title: 'Certificates' },
            'teachers': { title: 'Teachers' },
            'billing': { title: 'Billing' },
            'reports': { title: 'Reports' }
        };

        return pageInfo[this.currentPage] || { title: 'Dashboard' };
    }

    loadDashboardContent() {
        const content = document.getElementById('dashboardContent');
        if (!content) return;

        // Show loading state
        content.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading ${this.getCurrentPageInfo().title.toLowerCase()}...</p>
            </div>
        `;

        // Simulate loading time
        setTimeout(() => {
            const pageContent = this.getContentForPage(this.currentPage);
            content.innerHTML = pageContent;
        }, 500);
    }

    getContentForPage(page) {
        const role = this.currentUser.role;
        
        if (page === 'overview') {
            return this.getOverviewContent(role);
        }

        // Generic content for other pages
        return `
            <div class="page-content">
                <div class="dashboard-card">
                    <div class="card-header">
                        <h2 class="card-title">${this.getCurrentPageInfo().title}</h2>
                    </div>
                    <div class="card-content">
                        <p>This ${this.getCurrentPageInfo().title.toLowerCase()} page is currently under development.</p>
                        <p>Content will be tailored for your role as a <strong>${role.toLowerCase()}</strong>.</p>
                        <br>
                        <div style="padding: 20px; background: #f8faff; border-radius: 8px; border-left: 4px solid #3b82f6;">
                            <strong>Coming Soon:</strong>
                            <ul style="margin: 10px 0 0 20px;">
                                <li>Role-specific functionality</li>
                                <li>Interactive data visualization</li>
                                <li>Real-time updates</li>
                                <li>Advanced filtering and search</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getOverviewContent(role) {
        const roleSpecificOverviews = {
            'ADMIN': `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">1,247</div>
                        <div class="stat-label">Total Users</div>
                        <div class="stat-change positive">↗ +12% this month</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">342</div>
                        <div class="stat-label">Active Stories</div>
                        <div class="stat-change positive">↗ +8% this week</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">89</div>
                        <div class="stat-label">Pending Reviews</div>
                        <div class="stat-change negative">↗ +5 today</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">23</div>
                        <div class="stat-label">System Alerts</div>
                        <div class="stat-change">→ Same as yesterday</div>
                    </div>
                </div>
                <div class="quick-actions">
                    <div class="quick-action" onclick="dashboardManager.navigateTo('users')">
                        <span class="icon">👥</span>
                        <div class="title">Manage Users</div>
                        <div class="description">Add, edit, or remove user accounts</div>
                    </div>
                    <div class="quick-action" onclick="dashboardManager.navigateTo('content')">
                        <span class="icon">📚</span>
                        <div class="title">Review Content</div>
                        <div class="description">Approve stories and manage content</div>
                    </div>
                    <div class="quick-action" onclick="dashboardManager.navigateTo('analytics')">
                        <span class="icon">📈</span>
                        <div class="title">View Analytics</div>
                        <div class="description">Check platform performance metrics</div>
                    </div>
                </div>
            `,
            'VOLUNTEER': `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">5</div>
                        <div class="stat-label">Active Projects</div>
                        <div class="stat-change positive">↗ +1 this week</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">12</div>
                        <div class="stat-label">Stories to Review</div>
                        <div class="stat-change">→ Same as yesterday</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">8</div>
                        <div class="stat-label">Students Mentoring</div>
                        <div class="stat-change positive">↗ +2 this month</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">47</div>
                        <div class="stat-label">Volunteer Hours</div>
                        <div class="stat-change positive">↗ This month</div>
                    </div>
                </div>
                <div class="quick-actions">
                    <div class="quick-action" onclick="dashboardManager.navigateTo('review')">
                        <span class="icon">✅</span>
                        <div class="title">Review Content</div>
                        <div class="description">Review and approve submitted stories</div>
                    </div>
                    <div class="quick-action" onclick="dashboardManager.navigateTo('mentoring')">
                        <span class="icon">🤝</span>
                        <div class="title">Mentoring</div>
                        <div class="description">Connect with students you're mentoring</div>
                    </div>
                </div>
            `,
            'TEACHER': `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">3</div>
                        <div class="stat-label">Active Classes</div>
                        <div class="stat-change">→ Same as last term</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">67</div>
                        <div class="stat-label">Total Students</div>
                        <div class="stat-change positive">↗ +5 new students</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">15</div>
                        <div class="stat-label">Active Assignments</div>
                        <div class="stat-change negative">↗ 3 due this week</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">89%</div>
                        <div class="stat-label">Avg Completion Rate</div>
                        <div class="stat-change positive">↗ +5% improvement</div>
                    </div>
                </div>
                <div class="quick-actions">
                    <div class="quick-action" onclick="dashboardManager.navigateTo('classes')">
                        <span class="icon">🎓</span>
                        <div class="title">Manage Classes</div>
                        <div class="description">View and organize your classes</div>
                    </div>
                    <div class="quick-action" onclick="dashboardManager.navigateTo('assignments')">
                        <span class="icon">📋</span>
                        <div class="title">Assignments</div>
                        <div class="description">Create and grade assignments</div>
                    </div>
                </div>
            `,
            'LEARNER': `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">23</div>
                        <div class="stat-label">Books Read</div>
                        <div class="stat-change positive">↗ +3 this month</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">5</div>
                        <div class="stat-label">Stories Written</div>
                        <div class="stat-change positive">↗ +1 this week</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">12</div>
                        <div class="stat-label">Achievements</div>
                        <div class="stat-change positive">↗ +2 new badges</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">156</div>
                        <div class="stat-label">Reading Streak</div>
                        <div class="stat-change positive">↗ Days in a row!</div>
                    </div>
                </div>
                <div class="quick-actions">
                    <div class="quick-action" onclick="dashboardManager.navigateTo('library')">
                        <span class="icon">📚</span>
                        <div class="title">My Library</div>
                        <div class="description">Browse your saved books and stories</div>
                    </div>
                    <div class="quick-action" onclick="dashboardManager.navigateTo('writing')">
                        <span class="icon">✍️</span>
                        <div class="title">Write a Story</div>
                        <div class="description">Start writing your next story</div>
                    </div>
                </div>
            `,
            'INSTITUTION': `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">342</div>
                        <div class="stat-label">Total Students</div>
                        <div class="stat-change positive">↗ +15 this semester</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">15</div>
                        <div class="stat-label">Teachers</div>
                        <div class="stat-change positive">↗ +2 new hires</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">23</div>
                        <div class="stat-label">Active Classes</div>
                        <div class="stat-change">→ Same as last term</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">87%</div>
                        <div class="stat-label">Engagement Rate</div>
                        <div class="stat-change positive">↗ +8% improvement</div>
                    </div>
                </div>
                <div class="quick-actions">
                    <div class="quick-action" onclick="dashboardManager.navigateTo('teachers')">
                        <span class="icon">👨‍🏫</span>
                        <div class="title">Manage Teachers</div>
                        <div class="description">Add and manage teacher accounts</div>
                    </div>
                    <div class="quick-action" onclick="dashboardManager.navigateTo('reports')">
                        <span class="icon">📊</span>
                        <div class="title">View Reports</div>
                        <div class="description">Check institutional performance</div>
                    </div>
                </div>
            `
        };

        const recentActivity = `
            <div class="dashboard-card">
                <div class="card-header">
                    <h2 class="card-title">Recent Activity</h2>
                    <button class="card-action">View All</button>
                </div>
                <div class="activity-list">
                    <div class="activity-item">
                        <div class="activity-icon" style="background: #eff6ff; color: #3b82f6;">📚</div>
                        <div class="activity-content">
                            <div class="activity-title">New story submitted for review</div>
                            <div class="activity-description">"The Magic Forest" by Sarah Chen</div>
                        </div>
                        <div class="activity-time">2 hours ago</div>
                    </div>
                    <div class="activity-item">
                        <div class="activity-icon" style="background: #f0fdf4; color: #22c55e;">✅</div>
                        <div class="activity-content">
                            <div class="activity-title">Story approved and published</div>
                            <div class="activity-description">"Ocean Adventures" is now live</div>
                        </div>
                        <div class="activity-time">5 hours ago</div>
                    </div>
                    <div class="activity-item">
                        <div class="activity-icon" style="background: #fef3c7; color: #f59e0b;">👤</div>
                        <div class="activity-content">
                            <div class="activity-title">New user registered</div>
                            <div class="activity-description">Welcome Emma Thompson!</div>
                        </div>
                        <div class="activity-time">1 day ago</div>
                    </div>
                </div>
            </div>
        `;

        return (roleSpecificOverviews[role] || '') + recentActivity;
    }
}

// Global logout function
async function logout() {
    try {
        await window.mockSessionManager.signOut();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = '../index.html';
    }
}

// Initialize dashboard when DOM is ready
let dashboardManager;

document.addEventListener('DOMContentLoaded', function() {
    dashboardManager = new DashboardManager();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', function(event) {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || 'overview';
    if (dashboardManager) {
        dashboardManager.currentPage = page;
        dashboardManager.setupNavigation();
        dashboardManager.loadDashboardContent();
    }
});
