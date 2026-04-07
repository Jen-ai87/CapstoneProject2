# 90mins

**90mins** is a football live-score and match-tracking application. It provides live fixtures, standings, team/player views, reminders, and user favorites with a local demo authentication flow.

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
```

Notes:

- `VITE_API_PROVIDER` supports `bsd` or `sportsapipro`.
- In local development, Vite proxy settings in `90Mins/vite.config.ts` forward `/api` requests.
- In production, serverless proxy handlers in `api/` can be used for BSD requests.

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

The app currently uses local demo auth data (in-memory + localStorage), not a production identity provider.

Demo sign-in accounts:

- Email: `john@example.com` | Password: `password123`
- Email: `jane@example.com` | Password: `password123`

You can also create a new account from the Sign Up flow inside the app.

## 9. Deployment Notes

`vercel.json` is configured to:

- install and build from `90Mins/`
- serve output from `90Mins/dist`
- rewrite non-API routes to `index.html` for SPA routing

When deploying, set required environment variables in your hosting platform (for example, Vercel Project Settings -> Environment Variables).

## 10. Quick Troubleshooting

- If API data is missing, verify `VITE_API_PROVIDER` and API keys.
- If you get CORS or request errors in production, check proxy routes in `api/`.
- If favorites/profile state looks inconsistent, clear browser localStorage and sign in again.
