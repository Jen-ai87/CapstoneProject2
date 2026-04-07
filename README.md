# 90mins

**90mins** is a football live-score and match-tracking application. It provides live fixtures, standings, team/player views, reminders, and user favorites with Supabase-backed authentication and user data sync.

This repository contains:

- `90Mins/` - the Ionic + React frontend application.
- `api/` - serverless proxy functions used in production deployments (for BSD API routing/CORS).

## 1. Software Introduction

90Mins is designed to let users:

- Track live and scheduled football matches.
- Filter fixtures by date and league.
- View match details, standings, teams, and players.
- Save favorites and set reminders.
- Sign in/sign up for personalized features.

The app can run against multiple football data providers, with BSD (Bzzoiro Sports Data) as the default provider.

## 2. Libraries and Frameworks Used

Main frontend libraries (from `90Mins/package.json`):

- `@ionic/react`, `@ionic/react-router` - Ionic UI and navigation.
- `react`, `react-dom` - React app runtime.
- `react-router`, `react-router-dom` - routing.
- `typescript` - typed development.
- `vite` - local dev server and production build tool.
- `vitest` + Testing Library packages - unit testing.
- `cypress` - end-to-end testing.
- `eslint` + plugins - linting.

## 3. External Software and Services

Install these tools locally:

- Node.js 18+ (recommended: latest active LTS)
- npm 10+
- Git

External services used:

- BSD API: https://sports.bzzoiro.com
- SportsAPIPro: https://sportsapipro.com
- Supabase (Auth + Postgres): https://supabase.com
- Vercel (optional deployment): https://vercel.com

## 4. Project Setup

From repository root:

```bash
git clone https://github.com/Jen-ai87/CapstoneProject2.git
cd CapstoneProject2/90Mins
npm install
```

## 5. Environment Configuration

The frontend expects environment variables in `90Mins/.env`.

Current required keys:

```env
VITE_API_PROVIDER=bsd
VITE_BSD_API_KEY=your_bsd_token
VITE_SPORTSAPIPRO_API_KEY=your_sportsapipro_key
VITE_USE_MOCK_DATA=false
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Notes:

- `VITE_API_PROVIDER` supports `bsd` or `sportsapipro`.
- In local development, Vite proxy settings in `90Mins/vite.config.ts` forward `/api` requests.
- In production, serverless proxy handlers in `api/` can be used for BSD requests.
- Do not commit real keys to Git. Keep them in local `.env` and in deployment environment variable settings.

## 6. How to Run the Software

Run locally (development mode):

```bash
cd 90Mins
npm run dev
```

Then open the URL shown by Vite (typically `http://localhost:5173`).

Build for production:

```bash
cd 90Mins
npm run build
```

Preview production build locally:

```bash
cd 90Mins
npm run preview
```

## 7. Testing and Linting

From `90Mins/`:

```bash
npm run test.unit
npm run test.e2e
npm run lint
```

## 8. Login and Required Access Information

Authentication is handled by Supabase Auth.

For local testing:

- Users can sign up and sign in directly from the app Auth modal.
- If Supabase environment variables are missing, browsing public match data still works, but account features (sign in, favourites sync, profile sync, cloud notification history) will not work.

Professor/local evaluation tip:

- For full feature testing, provide valid Supabase URL + anon key in `90Mins/.env`.
- For read-only UI exploration without account features, the app can still be opened and used for non-authenticated pages.

## 9. Deployment Notes

`vercel.json` is configured to:

- install and build from `90Mins/`
- serve output from `90Mins/dist`
- rewrite non-API routes to `index.html` for SPA routing

When deploying, set required environment variables in your hosting platform (for example, Vercel Project Settings -> Environment Variables).

For Supabase auth redirects in deployed environments, set Supabase Auth URL configuration:

- Site URL: `https://capstone-project2-az2y.vercel.app/`
- Redirect URLs: deployed URL(s) plus local dev URL(s), for example:
	- `https://capstone-project2-az2y.vercel.app/`
	- `https://capstone-project2-az2y.vercel.app/*`
	- `http://localhost:5173`
	- `http://localhost:5173/*`

## 10. Quick Troubleshooting

- If API data is missing, verify `VITE_API_PROVIDER` and API keys.
- If you get CORS or request errors in production, check proxy routes in `api/`.
- If account features are unavailable, verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- If user-specific state looks inconsistent after config changes, sign out and sign back in.
