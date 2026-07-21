# Bible Bio X - Product Requirements Document

## Original Problem Statement
Bible Bio X - A production-grade mobile-first Bible study companion app with 8 AI-powered tools, JWT authentication, mood tracking, verse of the day, prayer generation, and elegant dark/light theming. Built to feel comparable to Apple, Linear, Notion, and Stripe-quality software.

## Architecture

### Backend (FastAPI + MongoDB)
- **Location**: `/app/backend/server.py`
- **Auth**: JWT-based with httpOnly cookies, bcrypt password hashing, brute-force protection
- **AI**: OpenAI GPT-5.2 via `emergentintegrations` library with SSE streaming
- **Bible Data**: Free `bible-api.com` for verse lookup
- **Database**: MongoDB collections - users, saved_verses, mood_checks, login_attempts, password_reset_tokens

### Frontend (React + Framer Motion)
- **Location**: `/app/frontend/src/`
- **Routing**: React Router with protected routes
- **State**: AuthContext for global auth state
- **Design**: Dark theme by default (Midnight & Gold), Cormorant Garamond for headings, Manrope for body
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Icons**: lucide-react

## Core Requirements

### User Personas
1. **Devotional User** - Wants daily verses, prayers, mood tracking
2. **Bible Student** - Wants deep character bios, verse explanations, parable analysis
3. **Pastor/Preacher** - Wants sermon architect and theological Q&A
4. **Parent/Teacher** - Wants children's Bible stories

### Features Implemented (v1.0 - 2026-02)
- [x] JWT authentication (register/login/logout/refresh/forgot-password/reset-password)
- [x] Admin seeding with brute-force protection
- [x] Today view: greeting, 5-emoji mood tracker, verse of the day with save
- [x] Explore view: 8 AI tool cards in bento grid
- [x] All 8 AI tools with streaming SSE responses:
  - Character Bio (with focus + depth levels)
  - Verse Lookup (via bible-api.com)
  - Verse Explainer (3 styles)
  - Sermon Architect (audience + style)
  - Parable Explainer (3 focus modes)
  - Daily Devotional (date-based)
  - Ask Theologian (3 complexity levels)
  - Children's Story
- [x] Prayer Hub with 4 tones + streaming AI
- [x] Settings: profile display, dark/light theme toggle, logout
- [x] Bottom navigation (Home, Study, Prayer, Settings) with active indicator
- [x] Back button navigation stack for sub-pages
- [x] Mobile-first responsive design (max-width 480px)
- [x] Theme persistence via localStorage
- [x] Sonner toasts for all user feedback

### API Endpoints
- **Auth**: `/api/auth/{register,login,logout,me,refresh,forgot-password,reset-password}`
- **Bible**: `/api/bible/verse?reference=`, `/api/bible/verse-of-day`
- **User Data**: `/api/mood`, `/api/mood/history`, `/api/verses/{save,saved,:id}`
- **AI Generation** (SSE streaming): `/api/generate/{bio,explainer,sermon,parable,devotional,theologian,prayer,story}`

## Test Credentials
- Admin: `admin@biblebio.com` / `BibleAdmin2024!`

## Prioritized Backlog

### P1 - Post-MVP Enhancements
- [ ] Saved Verses view (list, delete, share)
- [ ] Mood history chart/visualization
- [ ] Reading plans (30-day, chronological, etc.)
- [ ] Share generated content (prayers, devotionals) via link/image
- [ ] Push notifications for daily verse

### P2 - Growth Features
- [ ] Community: share favorite verses/prayers with others
- [ ] Premium tier: unlimited AI generations, longer contexts
- [ ] Audio playback of verses and prayers (ElevenLabs TTS)
- [ ] Multi-language support
- [ ] Prayer journal with reminders

### P3 - Advanced
- [ ] Offline mode with cached verses
- [ ] Bible translation selector (KJV, NIV, ESV, NLT)
- [ ] Cross-reference tool
- [ ] Original language (Greek/Hebrew) word study

## Testing Status
- Backend: 100% (all endpoints tested via curl including SSE streaming)
- Frontend: 90% (all key flows working; theme toggle + data-testids improved in v1.0.1)
- Integration: OpenAI GPT-5.2 streaming verified progressive delivery
