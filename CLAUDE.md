# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A job application tracking system consisting of three components:
- **extension/** — Chrome extension (React 19 + Vite + @crxjs/vite-plugin) injected as shadow DOM into any webpage
- **web/** — Web dashboard SPA (React 19 + React Router 7 + Vite) for viewing tracked applications and the job board
- **backend/** — Express 5 server (Node.js) on port 4000, backed by Supabase

## Commands

### Backend
```bash
cd backend && npm run dev    # nodemon watch mode
cd backend && npm start      # production
```

### Extension
```bash
cd extension && npm run dev  # Vite dev build (load unpacked in chrome://extensions)
cd extension && npm run build
```

### Web
```bash
cd web && npm run dev
cd web && npm run build
```

### Tests
The only test suite uses Node's built-in test runner (no Jest/Vitest):
```bash
cd backend && node --test src/lib/dedup.test.js
```

## Architecture

### Data Flow
1. Extension extracts job data from job posting pages (F9 hotkey) → saves to Supabase directly or via backend
2. Webhook endpoint (`POST /api/webhooks/apify`) ingests scraped jobs from Apify, runs deduplication, inserts into `scraped_jobs` table
3. Web dashboard reads applications and scraped jobs from backend/Supabase

### Extension Internals
- `extension/src/content/index.jsx` — content script entry; mounts React app into an isolated shadow DOM
- `extension/src/components/App.jsx` — main UI; handles F9 to auto-extract and show sidebar
- `extension/src/services/applications.js` — dispatches saves to either Supabase or custom backend based on settings
- `extension/src/config.js` — hardcoded Supabase URL and anon key

### Backend Routes (`backend/src/routes/`)
| Route | File |
|-------|------|
| `/api/auth` | `auth.js` |
| `/api/applications` | `applications.js` |
| `/api/profiles` | `profiles.js` |
| `/api/team` | `team.js` |
| `/api/admin` | `admin.js` |
| `/api/scraped-jobs` | `scraped-jobs.js` |
| `/api/webhooks` | `webhooks.js` |

**Important**: `/api/webhooks` uses `express.raw()` (not `express.json()`) for HMAC signature verification — this middleware order in `backend/src/index.js` must not change.

### Deduplication (`backend/src/lib/dedup.js`)
- `jaccardSimilarity(a, b)` — token-set Jaccard similarity, case-insensitive, punctuation-stripped
- `deduplicateJob(supabase, job)` — soft-deletes existing `scraped_jobs` rows that match the same company/title and exceed `DEDUP_SIMILARITY_THRESHOLD` on description similarity

### Web Dashboard Routes (`web/src/App.jsx`)
`/signin`, `/signup`, `/dashboard` (protected), `/job-board` (protected), `/team` (protected), `/admin` (role-gated)

## Environment
Backend reads from `.env` (see `backend/src/lib/supabase.js` for required vars). The extension's Supabase credentials are hardcoded in `extension/src/config.js`.
