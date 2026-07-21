# Auth Testing Playbook for Bible Bio X

## Authentication Methods
1. **JWT (email/password)**: `access_token` httpOnly cookie
2. **Google OAuth (Emergent-managed)**: `session_token` httpOnly cookie

## Backend Endpoints
- `POST /api/auth/register` - Email/password registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/session` - Google OAuth session exchange (sends X-Session-ID header)
- `GET /api/auth/me` - Get current user (works with both auth methods)
- `POST /api/auth/logout` - Logout (clears both cookies + session record)

## Frontend Flow (Google OAuth)
1. User clicks "Sign in with Google" → redirects to `https://auth.emergentagent.com/?redirect=${window.location.origin}/app`
2. After Google auth → lands at `${redirect_url}#session_id=xxx`
3. AppRouter detects `session_id` in URL fragment → renders AuthCallback
4. AuthCallback calls `POST /api/auth/session` with `X-Session-ID` header
5. Backend calls Emergent's `/session-data` endpoint, stores session, sets `session_token` cookie
6. Frontend redirects to `/app` with user data in state

## Test Credentials
- JWT Admin: `admin@biblebio.com` / `BibleAdmin2024!`
- Google OAuth: Uses any Google account via Emergent auth service

## Testing Steps
```bash
# 1. Verify JWT login still works
curl -c cookies.txt -X POST https://devotional-explorer.preview.emergentagent.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@biblebio.com","password":"BibleAdmin2024!"}'

# 2. Verify /me works with JWT
curl -b cookies.txt https://devotional-explorer.preview.emergentagent.com/api/auth/me

# 3. Create test Google session in MongoDB
mongosh --eval "
use('test_database');
var userId = 'user_google_test_' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'googletest@example.com',
  name: 'Google Test User',
  auth_provider: 'google',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('session_token=' + sessionToken);
"

# 4. Test with session_token cookie
curl -H "Cookie: session_token=YOUR_TOKEN" https://devotional-explorer.preview.emergentagent.com/api/auth/me
```

## Success Criteria
✅ JWT login continues to work
✅ Google Sign-In button appears on Login page
✅ Google OAuth flow completes and lands on /app
✅ `/api/auth/me` returns user data for both auth types
✅ Logout clears both cookies
✅ All 8 AI tools work for Google-authenticated users
