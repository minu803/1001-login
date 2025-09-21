// Authentication and UI Management for 1001 Stories
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    async init() {
        // Check if user is already logged in
        await this.checkAuthStatus();
        this.setupEventListeners();
        this.updateUIForAuthState();
    }

    async checkAuthStatus() {
        try {
            // Check with NextAuth session endpoint
            const response = await fetch('/api/auth/session');
            if (response.ok) {
                const session = await response.json();
                if (session && session.user) {
                    this.currentUser = session.user;
                    this.isAuthenticated = true;
                }
            }
        } catch (error) {
            console.log('No active session found');
        }
    }

    setupEventListeners() {
        // Modal controls
        const loginButtons = document.querySelectorAll('.login, .btn.login');
        const signupButtons = document.querySelectorAll('.signup, .btn.signup');
        const signinButtons = document.querySelectorAll('.btn.secondary-btn');
        const modal = document.getElementById('loginModal');
        const closeModal = document.getElementById('closeModal');

        // Open modal for login
        loginButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal('signin');
            });
        });

        // Open modal for signup
        signupButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal('signup');
            });
        });

        // Also handle CTA section buttons
        signinButtons.forEach(btn => {
            if (btn.textContent.includes('Sign In')) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openModal('signin');
                });
            }
        });

        // Close modal
        closeModal?.addEventListener('click', () => this.closeModal());
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Form submissions
        const signinForm = document.getElementById('signinForm');
        const signupForm = document.getElementById('signupForm');

        signinForm?.addEventListener('submit', (e) => this.handleSignin(e));
        signupForm?.addEventListener('submit', (e) => this.handleSignup(e));

        // Demo buttons
        const demoButtons = document.querySelectorAll('.demo-btn');
        demoButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const email = btn.getAttribute('data-demo');
                this.handleDemoLogin(email);
            });
        });

        // Google auth buttons
        document.getElementById('googleSignin')?.addEventListener('click', () => {
            this.handleSocialAuth('google', 'signin');
        });
        document.getElementById('googleSignup')?.addEventListener('click', () => {
            this.handleSocialAuth('google', 'signup');
        });

        // Apple auth buttons
        document.getElementById('appleSignin')?.addEventListener('click', () => {
            this.handleSocialAuth('apple', 'signin');
        });
        document.getElementById('appleSignup')?.addEventListener('click', () => {
            this.handleSocialAuth('apple', 'signup');
        });

        // Facebook auth buttons
        document.getElementById('facebookSignin')?.addEventListener('click', () => {
            this.handleSocialAuth('facebook', 'signin');
        });
        document.getElementById('facebookSignup')?.addEventListener('click', () => {
            this.handleSocialAuth('facebook', 'signup');
        });

        // Twitter auth buttons
        document.getElementById('twitterSignin')?.addEventListener('click', () => {
            this.handleSocialAuth('twitter', 'signin');
        });

        // GitHub auth buttons
        document.getElementById('githubSignin')?.addEventListener('click', () => {
            this.handleSocialAuth('github', 'signin');
        });
        document.getElementById('githubSignup')?.addEventListener('click', () => {
            this.handleSocialAuth('github', 'signup');
        });

        // Microsoft auth buttons
        document.getElementById('microsoftSignin')?.addEventListener('click', () => {
            this.handleSocialAuth('microsoft', 'signin');
        });

        // LinkedIn auth buttons
        document.getElementById('linkedinSignin')?.addEventListener('click', () => {
            this.handleSocialAuth('linkedin', 'signin');
        });

        // Forgot password
        document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openForgotPasswordModal();
        });

        // Forgot password form
        document.getElementById('forgotPasswordForm')?.addEventListener('submit', (e) => {
            this.handleForgotPassword(e);
        });

        // Close forgot password modal
        document.getElementById('closeForgotModal')?.addEventListener('click', () => {
            this.closeForgotPasswordModal();
        });

        // Back to login
        document.getElementById('backToLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeForgotPasswordModal();
            this.openModal('signin');
        });

        // User type change for COPPA compliance
        document.getElementById('user-type')?.addEventListener('change', (e) => {
            this.handleUserTypeChange(e.target.value);
        });

        // Two-factor authentication
        document.getElementById('twoFactorForm')?.addEventListener('submit', (e) => {
            this.handleTwoFactorAuth(e);
        });

        document.getElementById('closeTwoFactorModal')?.addEventListener('click', () => {
            this.closeTwoFactorModal();
        });

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal?.style.display !== 'none') {
                this.closeModal();
            }
        });
    }

    openModal(tab = 'signin') {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'flex';
            this.switchTab(tab);
            // Focus first input
            setTimeout(() => {
                const firstInput = modal.querySelector('.tab-content.active input');
                firstInput?.focus();
            }, 100);
        }
    }

    closeModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'none';
            this.clearErrors();
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName)?.classList.add('active');

        this.clearErrors();
    }

    async handleSignin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const rememberMe = formData.get('rememberMe');

        if (!email) {
            this.showError('Please enter your email address');
            return;
        }

        this.showLoading(true);

        try {
            if (password) {
                // Admin/Volunteer login with credentials
                await this.signInWithCredentials(email, password, rememberMe);
            } else {
                // Magic link login
                await this.signInWithEmail(email, { rememberMe });
            }
        } catch (error) {
            this.showError(error.message || 'Login failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const email = formData.get('email');
        const userType = formData.get('userType');
        const agreeTerms = formData.get('agreeTerms');
        const parentalConsent = formData.get('parentalConsent');

        // Validation
        if (!name || !email || !userType) {
            this.showError('Please fill in all required fields');
            return;
        }

        if (!agreeTerms) {
            this.showError('You must agree to the Terms of Service and Privacy Policy');
            return;
        }

        // COPPA compliance check
        if (userType === 'LEARNER') {
            const coppaSection = document.getElementById('coppaSection');
            if (coppaSection && coppaSection.style.display !== 'none' && !parentalConsent) {
                this.showError('Parental consent is required for accounts under 13 years old');
                return;
            }
        }

        this.showLoading(true);

        try {
            // Create account with magic link
            await this.signInWithEmail(email, { 
                name, 
                userType, 
                isSignup: true,
                coppaCompliant: userType === 'LEARNER' ? !!parentalConsent : true
            });
        } catch (error) {
            this.showError(error.message || 'Account creation failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async signInWithCredentials(email, password, rememberMe) {
        // Use NextAuth credentials provider
        const result = await fetch('/api/auth/signin/credentials', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
                rememberMe,
                redirect: false
            })
        });

        const data = await result.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        if (data.ok) {
            // Refresh to get session
            await this.checkAuthStatus();
            this.closeModal();
            this.redirectToDashboard();
        }
    }

    async signInWithEmail(email, options = {}) {
        // Use NextAuth email provider
        const result = await fetch('/api/auth/signin/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                redirect: false,
                ...options
            })
        });

        if (result.ok) {
            this.showSuccess('Check your email for a magic link to sign in!');
            setTimeout(() => this.closeModal(), 3000);
        } else {
            throw new Error('Failed to send magic link');
        }
    }

    async handleDemoLogin(email) {
        this.showLoading(true);
        
        try {
            // Use demo provider
            const result = await fetch('/api/auth/signin/demo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    redirect: false
                })
            });

            const data = await result.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            if (data.ok) {
                await this.checkAuthStatus();
                this.closeModal();
                this.redirectToDashboard();
            }
        } catch (error) {
            this.showError('Demo login failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async handleSocialAuth(provider, type) {
        // Show loading state
        this.showLoading(true);
        
        try {
            // In a real implementation, this would redirect to the OAuth provider
            const callbackUrl = `${window.location.origin}/dashboard`;
            
            // Simulate different providers
            switch (provider) {
                case 'google':
                    window.location.href = `/api/auth/signin/google?callbackUrl=${callbackUrl}`;
                    break;
                case 'apple':
                    // Apple Sign In would use different flow
                    this.simulateSocialLogin(provider, 'Apple User');
                    break;
                case 'facebook':
                    window.location.href = `/api/auth/signin/facebook?callbackUrl=${callbackUrl}`;
                    break;
                case 'twitter':
                    window.location.href = `/api/auth/signin/twitter?callbackUrl=${callbackUrl}`;
                    break;
                case 'github':
                    window.location.href = `/api/auth/signin/github?callbackUrl=${callbackUrl}`;
                    break;
                case 'microsoft':
                    window.location.href = `/api/auth/signin/azure-ad?callbackUrl=${callbackUrl}`;
                    break;
                case 'linkedin':
                    window.location.href = `/api/auth/signin/linkedin?callbackUrl=${callbackUrl}`;
                    break;
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }
        } catch (error) {
            this.showError(`${provider} authentication failed. Please try again.`);
            this.showLoading(false);
        }
    }

    async simulateSocialLogin(provider, defaultName) {
        // Simulate a successful social login for demo purposes
        setTimeout(async () => {
            const user = {
                id: `${provider}-user-${Date.now()}`,
                email: `user@${provider}.com`,
                name: defaultName,
                role: 'LEARNER',
                emailVerified: new Date()
            };
            
            if (window.mockSessionManager) {
                window.mockSessionManager.createSession(user);
                await this.checkAuthStatus();
                this.closeModal();
                this.redirectToDashboard();
            }
        }, 1500);
    }

    openForgotPasswordModal() {
        this.closeModal();
        const modal = document.getElementById('forgotPasswordModal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => {
                document.getElementById('forgot-email')?.focus();
            }, 100);
        }
    }

    closeForgotPasswordModal() {
        const modal = document.getElementById('forgotPasswordModal');
        if (modal) {
            modal.style.display = 'none';
            this.clearForgotPasswordErrors();
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');

        if (!email) {
            this.showForgotPasswordError('Please enter your email address');
            return;
        }

        this.showForgotPasswordLoading(true);

        try {
            // Simulate sending password reset email
            const result = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            if (result.ok) {
                this.showForgotPasswordSuccess('Check your email for password reset instructions!');
                setTimeout(() => this.closeForgotPasswordModal(), 3000);
            } else {
                throw new Error('Failed to send reset email');
            }
        } catch (error) {
            this.showForgotPasswordError('Failed to send reset email. Please try again.');
        } finally {
            this.showForgotPasswordLoading(false);
        }
    }

    handleUserTypeChange(userType) {
        const coppaSection = document.getElementById('coppaSection');
        
        // Show COPPA consent for learner accounts (potential children)
        if (userType === 'LEARNER' && coppaSection) {
            coppaSection.style.display = 'block';
        } else if (coppaSection) {
            coppaSection.style.display = 'none';
        }
    }

    openTwoFactorModal() {
        this.closeModal();
        const modal = document.getElementById('twoFactorModal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => {
                document.getElementById('two-factor-code')?.focus();
            }, 100);
        }
    }

    closeTwoFactorModal() {
        const modal = document.getElementById('twoFactorModal');
        if (modal) {
            modal.style.display = 'none';
            this.clearTwoFactorErrors();
        }
    }

    async handleTwoFactorAuth(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const code = formData.get('code');

        if (!code || code.length !== 6) {
            this.showTwoFactorError('Please enter a valid 6-digit code');
            return;
        }

        this.showTwoFactorLoading(true);

        try {
            const result = await fetch('/api/auth/verify-2fa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code })
            });

            if (result.ok) {
                await this.checkAuthStatus();
                this.closeTwoFactorModal();
                this.redirectToDashboard();
            } else {
                throw new Error('Invalid verification code');
            }
        } catch (error) {
            this.showTwoFactorError('Invalid code. Please try again.');
        } finally {
            this.showTwoFactorLoading(false);
        }
    }

    redirectToDashboard() {
        if (this.currentUser && this.currentUser.role) {
            const dashboardRoutes = {
                'ADMIN': '/dashboard/admin',
                'VOLUNTEER': '/dashboard/volunteer',
                'TEACHER': '/dashboard/teacher',
                'LEARNER': '/dashboard/learner',
                'INSTITUTION': '/dashboard/institution'
            };
            
            const route = dashboardRoutes[this.currentUser.role] || '/dashboard';
            window.location.href = route;
        } else {
            window.location.href = '/dashboard';
        }
    }

    updateUIForAuthState() {
        const authButtons = document.querySelector('.auth-buttons');
        
        if (this.isAuthenticated && this.currentUser) {
            // Show user menu instead of login/signup buttons
            authButtons.innerHTML = `
                <div class="user-menu">
                    <div class="user-info">
                        <span class="user-name">${this.currentUser.name || this.currentUser.email}</span>
                        <span class="user-role">${this.currentUser.role}</span>
                    </div>
                    <div class="user-actions">
                        <a href="/dashboard" class="btn dashboard-btn">Dashboard</a>
                        <button class="btn logout-btn" onclick="authManager.logout()">Logout</button>
                    </div>
                </div>
            `;
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/signout', {
                method: 'POST',
            });
            
            this.currentUser = null;
            this.isAuthenticated = false;
            window.location.reload();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    showLoading(show) {
        const loading = document.getElementById('authLoading');
        const tabContents = document.querySelectorAll('.tab-content');
        
        if (show) {
            tabContents.forEach(content => content.style.display = 'none');
            loading.style.display = 'block';
        } else {
            loading.style.display = 'none';
            tabContents.forEach(content => content.classList.remove('active'));
            document.querySelector('.tab-button.active')?.getAttribute('data-tab');
            const activeTab = document.querySelector('.tab-button.active')?.getAttribute('data-tab');
            if (activeTab) {
                document.getElementById(activeTab)?.classList.add('active');
                document.getElementById(activeTab).style.display = 'block';
            }
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('authError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    showSuccess(message) {
        const errorDiv = document.getElementById('authError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.style.background = '#d1fae5';
            errorDiv.style.borderColor = '#a7f3d0';
            errorDiv.style.color = '#065f46';
        }
    }

    clearErrors() {
        const errorDiv = document.getElementById('authError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.style.background = '#fee2e2';
            errorDiv.style.borderColor = '#fecaca';
            errorDiv.style.color = '#dc2626';
        }
    }

    // Forgot Password Modal Utilities
    showForgotPasswordLoading(show) {
        const loading = document.getElementById('forgotLoading');
        const form = document.getElementById('forgotPasswordForm');
        
        if (show) {
            form.style.display = 'none';
            loading.style.display = 'block';
        } else {
            loading.style.display = 'none';
            form.style.display = 'block';
        }
    }

    showForgotPasswordError(message) {
        const errorDiv = document.getElementById('forgotError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.style.background = '#fee2e2';
            errorDiv.style.borderColor = '#fecaca';
            errorDiv.style.color = '#dc2626';
        }
    }

    showForgotPasswordSuccess(message) {
        const errorDiv = document.getElementById('forgotError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.style.background = '#d1fae5';
            errorDiv.style.borderColor = '#a7f3d0';
            errorDiv.style.color = '#065f46';
        }
    }

    clearForgotPasswordErrors() {
        const errorDiv = document.getElementById('forgotError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    // Two-Factor Modal Utilities
    showTwoFactorLoading(show) {
        const loading = document.getElementById('twoFactorLoading');
        const form = document.getElementById('twoFactorForm');
        
        if (show) {
            form.style.display = 'none';
            loading.style.display = 'block';
        } else {
            loading.style.display = 'none';
            form.style.display = 'block';
        }
    }

    showTwoFactorError(message) {
        const errorDiv = document.getElementById('twoFactorError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    clearTwoFactorErrors() {
        const errorDiv = document.getElementById('twoFactorError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
}

// Initialize auth manager when DOM is ready
let authManager;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize authentication manager
    authManager = new AuthManager();
    
    // Existing smooth scrolling functionality
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Header scroll effects
    let lastScrollTop = 0;
    const header = document.querySelector('.navbar');

    window.addEventListener('scroll', function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > 50) {
            header?.classList.add('scrolled');
        } else {
            header?.classList.remove('scrolled');
        }

        if (scrollTop > lastScrollTop && scrollTop > 100) {
            if (header) header.style.transform = 'translateY(-100%)';
        } else {
            if (header) header.style.transform = 'translateY(0)';
        }

        lastScrollTop = scrollTop;
    });

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Animate elements on scroll
    const animateElements = document.querySelectorAll('.feature-card, .book-card, .volunteer-card');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Button interaction effects
    const allButtons = document.querySelectorAll('.btn');
    allButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Add ripple effect
            if (!this.querySelector('.ripple')) {
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            }
        });
    });

    // Book card hover effects
    const bookCards = document.querySelectorAll('.book-card');
    bookCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
        });
    });
});

// CSS for ripple effect and user menu
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255,255,255,0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    button {
        position: relative;
        overflow: hidden;
    }

    .user-menu {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .user-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        font-size: 14px;
    }

    .user-name {
        font-weight: 600;
        color: #1a1a1a;
    }

    .user-role {
        font-size: 12px;
        color: #6b7280;
        text-transform: capitalize;
    }

    .user-actions {
        display: flex;
        gap: 8px;
    }

    .dashboard-btn {
        background: #3b82f6;
        color: white;
        padding: 8px 16px;
        font-size: 14px;
    }

    .dashboard-btn:hover {
        background: #2563eb;
    }

    .logout-btn {
        background: transparent;
        border: 1px solid #e5e7eb;
        color: #6b7280;
        padding: 8px 12px;
        font-size: 14px;
    }

    .logout-btn:hover {
        background: #f3f4f6;
        color: #374151;
    }

    .navbar.scrolled {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        box-shadow: 0 1px 10px rgba(0, 0, 0, 0.1);
    }

    @media (max-width: 768px) {
        .user-menu {
            flex-direction: column;
            gap: 8px;
        }
        
        .user-actions {
            flex-direction: column;
            width: 100%;
        }
    }
`;

document.head.appendChild(additionalStyles);
