# 1001 Stories Authentication Backend

A comprehensive authentication and authorization backend built with Node.js, Express, and MongoDB.

## Features

### 🔐 Core Authentication
- **JWT-based authentication** with access and refresh tokens
- **Password hashing** with bcrypt (configurable rounds)
- **Session management** with secure HttpOnly cookies
- **Account lockout** protection against brute force attacks
- **Password reset** with secure token-based flow
- **Email verification** with configurable expiration

### 🌐 Social Authentication (OAuth)
- **Google OAuth 2.0**
- **Facebook Login**
- **GitHub OAuth**
- **Account linking** for multiple providers
- Automatic email verification for OAuth users

### 👥 Role-Based Access Control (RBAC)
- **4 built-in roles**: Admin, Moderator, Creator, Learner
- **Granular permissions** system
- **Route-level authorization** middleware
- **Resource ownership** checks
- **Permission inheritance** and validation

### 🛡️ Security Features
- **Rate limiting** (configurable per endpoint)
- **CORS protection** with whitelist
- **Security headers** via Helmet.js
- **Input validation** and sanitization
- **SQL injection** and XSS protection
- **Security event logging**
- **Account lockout** after failed attempts

### 🔧 Additional Features
- **Two-Factor Authentication** (2FA) support
- **COPPA compliance** for users under 13
- **Legal compliance** (terms & privacy acceptance)
- **User profile management**
- **Admin dashboard** with user management
- **Session management** (view/revoke active sessions)
- **Comprehensive error handling**
- **Request/response logging**

## Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Redis (optional, for session storage)

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/1001-login

# JWT Secrets (generate strong secrets for production)
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# OAuth (optional - configure with real credentials)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
# ... other OAuth providers
```

### 3. Database Setup

Start MongoDB and run the seeding script:

```bash
# Seed the database with default users
npm run seed
```

This creates default users:
- **Admin**: admin@1001stories.com / Admin123!@#
- **Moderator**: moderator@1001stories.com / Moderator123!@#
- **Creator**: creator@1001stories.com / Creator123!@#
- **Learner**: learner@1001stories.com / Learner123!@#

### 4. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3001`

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "termsAccepted": true,
  "privacyPolicyAccepted": true,
  "isMinor": false
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "rememberMe": true,
  "twoFactorCode": "123456" // Optional, if 2FA enabled
}
```

#### Refresh Token
```http
POST /api/auth/refresh
// Refresh token sent via HttpOnly cookie
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

#### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

### User Management Endpoints

#### Get Profile
```http
GET /api/user/profile
Authorization: Bearer <access_token>
```

#### Update Profile
```http
PUT /api/user/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "John Smith",
  "profile": {
    "bio": "Updated bio",
    "preferences": {
      "theme": "dark",
      "language": "en"
    }
  }
}
```

#### Change Password
```http
PUT /api/user/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "password": "NewPass123!",
  "confirmPassword": "NewPass123!"
}
```

### Admin Endpoints

#### Get All Users
```http
GET /api/admin/users?page=1&limit=10&role=LEARNER&isActive=true
Authorization: Bearer <admin_access_token>
```

#### Update User Role
```http
PUT /api/admin/users/{userId}/role
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "role": "CREATOR"
}
```

#### Deactivate User
```http
PUT /api/admin/users/{userId}/status
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "isActive": false,
  "reason": "Policy violation"
}
```

### OAuth Endpoints

#### Google OAuth
```http
GET /api/auth/google
// Redirects to Google OAuth consent screen
```

#### Facebook OAuth
```http
GET /api/auth/facebook
// Redirects to Facebook OAuth consent screen
```

#### GitHub OAuth
```http
GET /api/auth/github
// Redirects to GitHub OAuth consent screen
```

## User Roles and Permissions

### Roles Hierarchy
1. **ADMIN** - Full system access
2. **MODERATOR** - Content moderation and user management
3. **CREATOR** - Content creation and editing
4. **LEARNER** - Content consumption and interaction

### Permission Matrix

| Permission | Admin | Moderator | Creator | Learner |
|------------|-------|-----------|---------|---------|
| MANAGE_USERS | ✅ | ❌ | ❌ | ❌ |
| VIEW_USERS | ✅ | ✅ | ❌ | ❌ |
| MODERATE_CONTENT | ✅ | ✅ | ❌ | ❌ |
| CREATE_CONTENT | ✅ | ❌ | ✅ | ❌ |
| EDIT_CONTENT | ✅ | ❌ | ✅ | ❌ |
| VIEW_CONTENT | ✅ | ✅ | ✅ | ✅ |
| COMMENT | ✅ | ✅ | ✅ | ✅ |
| RATE_CONTENT | ✅ | ✅ | ✅ | ✅ |

## Security Configuration

### Rate Limiting
- **General API**: 100 requests per 15 minutes per IP
- **Auth endpoints**: 5 requests per 15 minutes per IP
- **Customizable** via environment variables

### Password Requirements
- Minimum 8 characters
- Must contain uppercase letter
- Must contain lowercase letter  
- Must contain number
- Must contain special character

### Account Security
- **5 failed login attempts** → Account locked for 2 hours
- **JWT expiration**: 15 minutes (access), 7 days (refresh)
- **Password reset expiration**: 1 hour
- **Email verification expiration**: 24 hours

## Development

### File Structure
```
backend/
├── src/
│   ├── config/
│   │   ├── database.js       # MongoDB connection
│   │   └── passport.js       # OAuth strategies
│   ├── middleware/
│   │   ├── auth.js          # Authentication middleware
│   │   ├── errorHandler.js  # Error handling
│   │   └── validation.js    # Input validation
│   ├── models/
│   │   └── User.js          # User model with RBAC
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   ├── user.js          # User management routes
│   │   └── admin.js         # Admin routes
│   └── utils/
│       └── jwt.js           # JWT utilities
├── scripts/
│   └── seed.js              # Database seeding
├── logs/                    # Application logs
├── .env                     # Environment variables
├── .env.example            # Environment template
├── package.json
└── server.js               # Express server setup
```

### Adding New Permissions

1. Add permission to `PERMISSIONS` object in `src/models/User.js`
2. Update `ROLE_PERMISSIONS` mapping
3. Use in routes with `requirePermission()` middleware

### Adding New OAuth Providers

1. Install passport strategy: `npm install passport-provider-name`
2. Add strategy configuration in `src/config/passport.js`
3. Add environment variables for client ID/secret
4. Add routes for authorization and callback

## Production Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<strong-secret-256-bit>
JWT_REFRESH_SECRET=<different-strong-secret-256-bit>
# ... other production secrets
```

### Security Checklist
- [ ] Use strong, unique secrets for JWT
- [ ] Configure HTTPS/TLS
- [ ] Set up MongoDB authentication
- [ ] Configure OAuth with production URLs
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Use environment-specific CORS origins
- [ ] Enable security headers
- [ ] Set up backup strategy

### Monitoring
- Application logs in `logs/` directory
- Security events logged for suspicious activity
- Failed login attempt tracking
- Session monitoring and management

## Testing

```bash
# Run tests (when implemented)
npm test

# Run linting
npm run lint
```

## Support

For questions or issues:
1. Check the API documentation above
2. Review error logs in `logs/` directory
3. Verify environment configuration
4. Test with provided seed users

## License

MIT License - see LICENSE file for details.
