# PRD: Authentication & Authorization Test Coverage

## Overview
Complete test coverage for all authentication flows and role-based access control in Portal28.

## User Roles

### 1. Student (Default)
- **Role value**: `student`
- **Access**: `/app/*` routes, course content, community features
- **Cannot access**: `/admin/*` routes

### 2. Teacher/Admin
- **Role value**: `admin` or `teacher`
- **Access**: All student routes + `/admin/*` routes
- **Capabilities**: Course management, user management, analytics

## Authentication Flows to Test

### 1. Email/Password Signup
- **Endpoint**: `/signup`
- **Flow**: User enters email/password → Confirmation email sent → User clicks link → Redirected to `/auth/callback` → Session created → Redirected to `/app`
- **Test scenarios**:
  - [ ] Valid signup with new email
  - [ ] Duplicate email rejection
  - [ ] Password validation (min 6 chars)
  - [ ] Password confirmation match
  - [ ] Email confirmation link works
  - [ ] Redirect after confirmation

### 2. Email/Password Login
- **Endpoint**: `/login`
- **Flow**: User enters credentials → Session created → Redirected to `/app`
- **Test scenarios**:
  - [ ] Valid login
  - [ ] Invalid password rejection
  - [ ] Non-existent user rejection
  - [ ] Unconfirmed email handling

### 3. Magic Link Login
- **Endpoint**: `/login` (OTP option)
- **Flow**: User enters email → Magic link sent → User clicks link → Redirected to `/auth/callback` → Session created
- **Test scenarios**:
  - [ ] Magic link request
  - [ ] Magic link validation
  - [ ] Expired link handling
  - [ ] Already used link handling

### 4. Password Reset
- **Endpoint**: `/forgot-password`
- **Flow**: User enters email → Reset link sent → User clicks link → Reset form → New password set
- **Test scenarios**:
  - [ ] Reset request for valid email
  - [ ] Reset request for non-existent email (security: same response)
  - [ ] Reset link validation
  - [ ] Password update success

### 5. Logout
- **Flow**: User clicks logout → Session destroyed → Redirected to `/`
- **Test scenarios**:
  - [ ] Successful logout
  - [ ] Session cookie cleared
  - [ ] Protected routes inaccessible after logout

## Authorization Tests

### Route Protection
| Route | Student | Teacher | Admin | Unauthenticated |
|-------|---------|---------|-------|-----------------|
| `/` | ✅ | ✅ | ✅ | ✅ |
| `/login` | ✅ | ✅ | ✅ | ✅ |
| `/signup` | ✅ | ✅ | ✅ | ✅ |
| `/courses` | ✅ | ✅ | ✅ | ✅ |
| `/app` | ✅ | ✅ | ✅ | ❌ → `/login` |
| `/app/courses/*` | ✅ | ✅ | ✅ | ❌ → `/login` |
| `/admin` | ❌ → `/app` | ✅ | ✅ | ❌ → `/login` |
| `/admin/courses` | ❌ → `/app` | ✅ | ✅ | ❌ → `/login` |
| `/admin/users` | ❌ → `/app` | ❌ | ✅ | ❌ → `/login` |
| `/admin/analytics` | ❌ → `/app` | ✅ | ✅ | ❌ → `/login` |

### Role Detection Logic
```typescript
// In middleware or getUser helper
const role = user?.user_metadata?.role || 'student';
const isAdmin = role === 'admin';
const isTeacher = role === 'teacher' || role === 'admin';
const isStudent = true; // All authenticated users
```

## API Endpoints

### Auth Callback
- **Route**: `/auth/callback`
- **Method**: GET
- **Params**: `code`, `next` (optional)
- **Test scenarios**:
  - [ ] Valid code exchange
  - [ ] Invalid code rejection
  - [ ] Redirect to `next` param or `/app`

### Session Check
- **Route**: `/api/auth/session`
- **Method**: GET
- **Test scenarios**:
  - [ ] Returns user data when authenticated
  - [ ] Returns null when not authenticated

## Database Schema for Roles

```sql
-- users table has role column
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student';

-- Valid roles: 'student', 'teacher', 'admin'
```

## Implementation Checklist

### Middleware Updates
- [x] Redirect auth codes to `/auth/callback`
- [ ] Add role-based admin route protection
- [ ] Add teacher route protection

### UI Components
- [ ] Role indicator in navigation
- [ ] Admin-only menu items hidden for students
- [ ] Teacher dashboard access

### Test Files Required
- [ ] `e2e/auth-signup.spec.ts`
- [ ] `e2e/auth-login.spec.ts`
- [ ] `e2e/auth-magic-link.spec.ts`
- [ ] `e2e/auth-password-reset.spec.ts`
- [ ] `e2e/auth-logout.spec.ts`
- [ ] `e2e/auth-role-protection.spec.ts`

## Success Criteria
1. All auth flows work on production (`portal28.academy`)
2. Role-based access control enforced
3. 100% test coverage for auth endpoints
4. No security vulnerabilities in auth flow
