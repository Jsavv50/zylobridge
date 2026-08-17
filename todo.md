# ZYLOBRIDGE — Project TODO

## Phase 1: Assets & Setup
- [x] Upload ZYLOBRIDGE logo (AVIF/PNG) to CDN and reference via manus-upload-file
- [x] Install express-rate-limit and DOMPurify/sanitize-html for security
- [x] Configure WOFF2 fonts (Inter/Space Grotesk) via Google Fonts CDN

## Phase 2: Database Schema
- [x] Extend users table with role enum: client, professional, admin
- [x] Create jobs table (title, description, vocation, budget, location, deadline, status, clientId)
- [x] Create applications table (jobId, professionalId, coverLetter, bidAmount, status)
- [x] Create profiles table (userId, vocation, bio, skills, certifications, portfolioUrl, rating)
- [x] Create reviews table (jobId, reviewerId, revieweeId, rating, comment)
- [x] Run drizzle-kit generate and apply migrations

## Phase 3: Server-Side API & Security
- [x] Add express-rate-limit middleware to all /api routes
- [x] Add helmet.js for HTTP security headers
- [x] Add input sanitization middleware
- [x] Implement adminProcedure (role guard)
- [x] Implement professionalProcedure (role guard)
- [x] Implement clientProcedure (role guard)
- [x] Jobs router: create, list, getById, update, delete, updateStatus
- [x] Applications router: apply, list, updateStatus (accept/reject)
- [x] Profiles router: get, update, getByUserId
- [x] Reviews router: create, listByUser
- [x] Admin router: listUsers, updateUserRole, platformStats, listAllJobs, deleteJob

## Phase 4: Design System & Branding
- [x] Set ZYLOBRIDGE dark theme color palette (deep navy, electric purple, white)
- [x] Configure custom sans-serif font hierarchy in index.css
- [x] Build reusable Badge, VocationCard, JobCard, StatusBadge components
- [x] Build Navbar with role-aware navigation
- [x] Build Footer component

## Phase 5: Public Pages
- [x] Landing page hero section with logo and CTA
- [x] Vocations grid (all 12 vocations)
- [x] How It Works section
- [x] Trust & compliance indicators (verified badges, stats)
- [x] Public marketplace page with filters (vocation, location, budget, status)
- [x] Job detail page (public view)

## Phase 6: Contractor Dashboard
- [x] Dashboard overview with stats
- [x] Post a new job form (title, description, vocation, budget, location, deadline)
- [x] Manage my jobs list
- [x] View applications per job
- [x] Accept / reject applications
- [x] Track project status lifecycle (open → in-progress → completed → cancelled)

## Phase 7: Professional Dashboard
- [x] Dashboard overview with application stats
- [x] Browse jobs with filters
- [x] Apply to job (cover letter + bid amount)
- [x] Manage my applications
- [x] Edit professional profile (vocation, bio, skills, certifications)
- [x] View my reviews and ratings

## Phase 8: Admin Dashboard (admin-only, fully hidden from other roles)
- [x] Admin route guard (redirect non-admins to 404)
- [x] Platform analytics overview (users, jobs, applications)
- [x] Manage all users (list, promote/demote role)
- [x] Manage all jobs (list, delete)
- [x] View all applications
- [x] Platform activity feed

## Phase 9: Testing & Polish
- [x] Write vitest tests for all tRPC procedures
- [x] Verify rate limiting works on API routes
- [x] Verify admin routes are inaccessible to non-admins
- [x] Mobile-first responsive check on all pages
- [x] Save checkpoint

## Phase 10: Real-Time Messaging
- [x] Install socket.io (server) and socket.io-client (client)
- [x] Create conversations table (jobId, clientId, professionalId, lastMessageAt)
- [x] Create messages table (conversationId, senderId, content, isRead, createdAt)
- [x] Register Socket.io server in server/_core/index.ts with JWT auth guard
- [x] Build tRPC procedures: conversations.list, conversations.getMessages, conversations.create
- [x] Build MessagingPage with conversation list sidebar and message thread view
- [x] Real-time delivery: emit new_message event, update conversation list live
- [x] Unread message badge in Navbar
- [x] Wire messaging into contractor and professional dashboards

## Phase 11: Escrow Payments (Paystack + Bank Transfer)
- [x] Install paystack SDK or use Paystack REST API via fetch
- [x] Create escrow_payments table (jobId, clientId, professionalId, amount, currency, status, paystackRef, bankTransferRef, accountNumber, bankName, accountName, paidAt, releasedAt, refundedAt)
- [x] Paystack payment flow: initialize transaction → webhook verify → mark escrow funded
- [x] Bank transfer flow: admin-generated virtual account or manual account details, client uploads proof, admin confirms
- [x] Escrow release: contractor marks job complete → funds released to professional
- [x] Escrow refund: job cancelled → funds returned to client
- [x] Add PAYSTACK_SECRET_KEY to secrets
- [x] Build PaymentModal component (choose Paystack card or bank transfer)
- [x] Build EscrowStatusCard showing funded/released/refunded state
- [x] Admin can view and manage all escrow transactions
- [x] Wire payment into contractor dashboard (fund escrow after accepting application)

## Phase 12: Professional Verification Badges
- [x] Create verification_requests table (userId, documentType, documentUrl, status, adminNote, reviewedAt, reviewedBy)
- [x] Build VerificationRequestForm: upload licence/cert document, select document type
- [x] Store document in S3 via storagePut, save key in DB
- [x] Admin dashboard: list pending verification requests, approve/reject with note
- [x] On approval: set users.isVerified = true
- [x] Display VerifiedBadge (shield-check icon) on professional profiles, job applications, and marketplace cards
- [x] Notify professional via toast/notification on approval or rejection

## Phase 13: How It Works Page
- [x] Write comprehensive HowItWorks.tsx page covering all user roles and workflows
- [x] Wire /how-it-works route in App.tsx

## Phase 14: Paystack Product Purchases
- [x] Create products table (name, description, price, currency, imageUrl, category, isActive)
- [x] Create orders table (userId, productId, amount, currency, status, paystackReference, paidAt)
- [x] Apply DB migration for products and orders tables
- [x] Add product query helpers to db.ts
- [x] Add tRPC procedures: products.list, products.getById, orders.initiate, orders.verify, orders.myOrders
- [x] Build Products/Shop page with product cards and Paystack checkout
- [x] Build Order Confirmation page and order history in user dashboard
- [x] Add Paystack webhook handler for automatic order confirmation
- [x] Wire /shop and /orders routes in App.tsx

## Phase 15: Phone Number Sign-Up / Login
- [x] Create phone_otps table (phone, otp, expiresAt, verified)
- [x] Apply DB migration for phone_otps table
- [x] Add server-side OTP generation and verification procedures
- [x] Integrate SMS OTP delivery (Termii or Paystack SMS or mock for dev)
- [x] Build PhoneAuth page with phone input + OTP verification step
- [x] Link phone auth to existing user account (upsert by phone)
- [x] Add "Sign in with Phone" button to the login flow
- [x] Wire /auth/phone route in App.tsx

## Phase 17: Sign In / Get Started Page
- [x] Remove phone login button from Navbar
- [x] Build dedicated /sign-in page with OAuth login + phone OTP as active options
- [x] Update all login CTAs (hero, CTA section, etc.) to point to /sign-in
- [x] Wire /sign-in route in App.tsx

## Phase 19: Resend Email Integration
- [x] Add RESEND_API_KEY secret
- [x] Install resend SDK
- [x] Build server/email.ts with sendOtpEmail helper using branded ZYLOBRIDGE template
- [x] Wire sendOtpEmail into emailAuth.sendOtp procedure
- [x] Test full email OTP delivery flow (28/28 tests passing)

## Phase 20: Vercel Deployment Fix
- [x] Create api/index.ts — Vercel serverless function entry point wrapping Express app
- [x] Rewrite vercel.json — outputDirectory: dist/public, buildCommand: build:client, /api/* → api/index.ts, SPA rewrites
- [x] Add build:client script to package.json (vite build only, no server bundle)
- [x] Verify 0 TypeScript errors after changes
- [x] Verify 34 tests still passing after changes
- [x] Save checkpoint

## Phase 21: Vercel outputDirectory + buildCommand Fix
- [x] Diagnosed root cause: dist/ in .gitignore means Vercel never receives pre-built frontend; no buildCommand/outputDirectory meant Vercel served api/index.ts bundle as plain text
- [x] Added buildCommand: "pnpm run build:client" to vercel.json so Vercel runs Vite before deploying
- [x] Added outputDirectory: "dist/public" to vercel.json so Vercel serves index.html at /
- [x] Added installCommand: "pnpm install --frozen-lockfile" for deterministic installs
- [x] Kept /api/(.*) → api/index.ts and /(.*) → /index.html rewrites
- [x] Verified 0 TypeScript errors and 34/34 tests passing
- [x] Saved checkpoint and pushed to GitHub

## Phase 22: Privacy Policy Page
- [x] Build enterprise-grade PrivacyPolicy.tsx with sticky TOC, keyword search, callout boxes, breadcrumb navigation
- [x] Preserve all 13 sections of legal content word-for-word with correct numbering and hierarchy
- [x] Implement WCAG-compliant accessible markup (semantic HTML, aria labels, keyboard navigation, focus rings)
- [x] Add IntersectionObserver for active section highlighting in sticky TOC
- [x] Add back-to-top button with scroll visibility detection
- [x] Add document info footer with last updated date, company name, contact email, and related policy links
- [x] Register /privacy-policy route in App.tsx
- [x] Update Footer.tsx to link Privacy Policy to /privacy-policy route
- [x] Verify 0 TypeScript errors
- [x] Save checkpoint and push to GitHub

## Phase 23: Google OAuth + Supabase Integration
- [x] Store GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY as project secrets
- [x] Install @supabase/supabase-js on server and client
- [x] Add Supabase env vars to server/_core/env.ts
- [x] Build server-side Google OAuth routes: /api/auth/google (redirect) and /api/auth/google/callback (exchange + session)
- [x] On successful Google callback: upsert user in local DB + create Supabase session
- [x] Update SignIn.tsx Google button to use direct Google OAuth URL (/api/auth/google)
- [x] Register Google auth routes in both server/_core/index.ts and api/index.ts (Vercel)
- [x] Write credential validation tests for Google and Supabase (41/41 passing)
- [x] Verify 0 TypeScript errors
- [x] Save checkpoint and push to GitHub

## Phase 24: User Profile Dashboard + Terms of Service Page
- [x] Build UserProfile.tsx — account details, settings, sign-out, role display, verification status
- [x] Register /profile route in App.tsx
- [x] Update Navbar user dropdown to link to /profile (My Profile item with User icon)
- [x] Build TermsOfService.tsx using same premium layout as PrivacyPolicy.tsx (14 sections, sticky TOC, keyword search, callouts)
- [x] Register /terms route in App.tsx
- [x] Update Footer.tsx Terms of Service link to /terms
- [x] Verify 0 TypeScript errors and 41/41 tests passing
- [x] Save checkpoint and push to GitHub

## Phase 25: Google OAuth FUNCTION_INVOCATION_FAILED Fix
- [x] Fix Crash 1: supabase.ts — replaced assertSupabaseConfig() throw with lazy init returning null; getSupabaseAdmin/Public now return null instead of throwing when credentials missing
- [x] Fix Crash 2: googleAuth.ts — added getCallbackUrl() with explicit protocol validation; throws a clear error if APP_BASE_URL/VERCEL_URL resolves without https://
- [x] Fix Crash 3: googleAuth.ts — added VITE_APP_ID guard with console.warn if missing; session token still created but operator is alerted
- [x] Fix Crash 4: loginMethod "google" is a varchar(64) — no enum constraint, already valid
- [x] Add startup diagnostics in registerGoogleAuthRoutes() — logs missing env vars and resolved callback URL at cold-start
- [x] Verify 0 TypeScript errors and 41/41 tests passing
- [x] Save checkpoint and push to GitHub

## Phase 26: Vercel Module Resolution Fix — Cannot find module server/core/auth
- [x] Identified root cause: sdk.ts imported from @shared/_core/errors; Vercel's bundler strips leading underscores from directory names, resolving _core → core at runtime, producing the path /var/task/server/core/auth which does not exist
- [x] Created shared/core/ directory as a copy of shared/_core/ (both kept for safety)
- [x] Updated server/_core/sdk.ts line 2: @shared/_core/errors → @shared/core/errors
- [x] Scanned entire project for any other @shared/_core references — none found
- [x] Verified 0 TypeScript errors and 41/41 tests passing
- [x] Saved checkpoint and pushed to GitHub

## Phase 27: Complete Repository Import Audit for Vercel Production
- [x] Scan every .ts/.tsx/.js/.mjs file for broken imports and unresolved aliases — completed during Phases 29–31
- [x] Simulate exact Vercel serverless build (esbuild bundle of api/index.ts with alias resolution) — superseded by split Vercel frontend/Railway backend architecture
- [x] Fix every broken import: @shared/_core, relative paths, missing modules — completed during Phases 29–31
- [x] Run production build with zero ERR_MODULE_NOT_FOUND errors — completed during Phases 29–31
- [x] Verify 0 TypeScript errors and all tests passing — completed during Phases 29–31
- [x] Save checkpoint and push to GitHub — completed during Phase 31

## Phase 33: Restore Vercel Serverless Architecture
- [x] Create api/index.ts — Vercel serverless entry point mounting Express app (security, OAuth, Google Auth, storage proxy, tRPC, health check)
- [x] Rewrite vercel.json — buildCommand: pnpm run build:client, outputDirectory: dist/public, /api/* → api/index.ts, SPA fallback → /index.html
- [x] pnpm install succeeds (Done in 1.3s)
- [x] pnpm build:client succeeds — dist/public/index.html produced
- [x] 0 TypeScript errors (pnpm check clean)
- [x] 41/41 tests passing
- [x] /api/health returns {"status":"ok","timestamp":"..."}
- [x] Commit to GitHub

## Phase 31: Vercel Node.js Server Deployment Conversion
- [x] Audit current build scripts — pnpm build already runs vite build + esbuild server/_core/index.ts
- [x] Confirmed build script produces dist/index.js (113 kB self-contained Express bundle) + dist/public/ (Vite frontend)
- [x] Rewrote vercel.json: buildCommand: pnpm run build, builds @vercel/node pointing to dist/index.js, all routes → dist/index.js
- [x] Removed api/ serverless entry point directory entirely
- [x] Run pnpm build end-to-end — dist/index.js (113 kB) + dist/public/index.html produced
- [x] Verify 0 TypeScript errors and 41/41 tests passing
- [x] Save checkpoint and push to GitHub

## Phase 35: Railway Production Migration
- [x] Delete api/index.ts and api/ directory (Vercel serverless entry point removed)
- [x] Delete vercel.json (no Vercel configuration remaining)
- [x] Revert VITE_API_URL in client/src/main.tsx — restored to hardcoded /api/trpc (same-origin)
- [x] Clean server/_core/env.ts — removed VERCEL_URL, updated getBaseUrl() to use APP_BASE_URL or APP_URL for Railway
- [x] Update server/_core/googleAuth.ts — removed all Vercel references, updated error messages and comments for Railway
- [x] Add GET /api/health endpoint to server/_core/index.ts returning {status:"ok",timestamp:"..."}
- [x] pnpm build succeeds — dist/index.js 112.9 kB + dist/public/ produced
- [x] pnpm check — 0 TypeScript errors
- [x] pnpm test — 41/41 passing
- [x] Production server starts: /api/health 200, /api/trpc 200, / 200 (React frontend)
- [x] No VERCEL_URL or Vercel-specific references in source files
- [x] Commit to GitHub

## Phase 36: Split Deployment — Vercel (frontend) + Railway (backend)
- [x] Install cors and @types/cors packages
- [x] Add build:server script to package.json (esbuild server/_core/index.ts → dist/index.js)
- [x] Update build script to run build:client && build:server sequentially
- [x] Add engines field to package.json (node >=20.0.0)
- [x] Create vercel.json — buildCommand: pnpm run build:client, outputDirectory: dist/public, SPA fallback
- [x] Create railway.json — NIXPACKS builder, build:server, node dist/index.js start, /api/health healthcheck
- [x] Wire VITE_API_URL in client/src/main.tsx — API_URL const with Railway backend URL, falls back to "" for local dev
- [x] Add CORS middleware to server/_core/index.ts — reads FRONTEND_URL env var, allows Vercel origin + localhost
- [x] Audit shared/ — all files are browser-safe (pure TS types and utilities, no Node.js-only imports)
- [x] Confirm no runtime server/ or drizzle/ imports in client/src/
- [x] pnpm build:client succeeds — dist/public/ produced
- [x] pnpm build:server succeeds — dist/index.js 113.5 kB produced
- [x] pnpm check — 0 TypeScript errors
- [x] pnpm test — 41/41 passing
- [x] Commit to GitHub

## Phase 37: API-Only Railway Backend
- [x] Remove serveStatic() call and setupVite() call from server/_core/index.ts
- [x] Remove serveStatic import from server/_core/index.ts
- [x] Update CORS allowedOrigins to hardcode https://zylobridge.com in addition to FRONTEND_URL env var
- [x] Remove serveStatic() function body from server/_core/vite.ts (keep setupVite for local dev)
- [x] pnpm build:server succeeds with no errors
- [x] pnpm check — 0 TypeScript errors
- [x] pnpm test — 41/41 passing
- [x] Server starts without dist/public present
- [x] Commit to GitHub

## Phase 38: Production Deployment Audit Fixes
- [x] Fix Messaging.tsx Socket.io URL — replace window.location.origin with VITE_API_URL (Railway backend URL)
- [x] Fix SignIn.tsx Google OAuth link — replace /api/auth/google relative URL with ${VITE_API_URL}/api/auth/google absolute URL
- [x] pnpm check — 0 TypeScript errors
- [x] pnpm build:client and pnpm build:server succeed
- [x] pnpm test — 41/41 passing
- [x] Commit to GitHub

## Phase 39: Google OAuth 404 Fix + Root Endpoint
- [x] Fix googleAuth.ts post-callback redirect — use FRONTEND_BASE_URL env var for user redirect, keep APP_BASE_URL for OAuth callback
- [x] Add FRONTEND_BASE_URL to server/_core/env.ts
- [x] Add GET / root endpoint to server/_core/index.ts returning {status:"ok",service:"Zylobridge API"}
- [x] Update railway.json startCommand to pnpm start (instead of node dist/index.js directly)
- [x] Update vercel.json outputDirectory to dist (not dist/public) per audit requirement
- [x] pnpm check — 0 TypeScript errors
- [x] pnpm build:server succeeds
- [x] pnpm test — 41/41 passing
- [x] Commit to GitHub

## Phase 40: Google OAuth redirect_uri_mismatch Fix
- [x] Add BACKEND_URL env var alias to env.ts (reads BACKEND_URL > APP_BASE_URL > APP_URL)
- [x] Add FRONTEND_URL env var alias to env.ts getFrontendUrl() (reads FRONTEND_URL > FRONTEND_BASE_URL > appBaseUrl)
- [x] Add app.set("trust proxy", 1) to server/_core/index.ts for Railway HTTPS detection
- [x] Verify getCallbackUrl() generates exactly https://api.zylobridge.com/api/auth/google/callback
- [x] pnpm check — 0 TypeScript errors
- [x] pnpm build:server succeeds
- [x] pnpm test — 41/41 passing
- [x] Commit to GitHub

## Phase 41: PostgreSQL/Supabase Migration (MySQL → PostgreSQL)
- [x] Install postgres driver (postgres-js)
- [x] Rewrite drizzle/schema.ts from MySQL types to PostgreSQL types
- [x] Update drizzle.config.ts dialect from mysql to postgresql
- [x] Update server/db.ts to use drizzle-orm/postgres-js
- [x] Remove mysql2 from dependencies
- [x] Generate PostgreSQL CREATE TABLE SQL and apply to Supabase via webdev_execute_sql
- [x] Fix onDuplicateKeyUpdate → onConflictDoUpdate in server/db.ts upsertUser
- [x] Fix all other MySQL-specific query patterns (onDuplicateKeyUpdate) across server files
- [x] pnpm check — 0 TypeScript errors
- [x] pnpm build:server succeeds
- [x] pnpm test — all tests passing
- [x] Commit to GitHub

## Phase 43: Email OTP → Supabase Auth Migration [COMPLETE]
- [x] Replace emailAuth.sendOtp in routers.ts with supabase.auth.signInWithOtp
- [x] Replace emailAuth.verifyOtp in routers.ts with supabase.auth.verifyOtp + upsertUserByEmail + JWT session cookie
- [x] Add safe production logging (no OTP codes, no secrets)
- [x] Keep phoneAuth.sendOtp/verifyOtp unchanged (custom flow, separate)
- [x] Keep upsertUserByEmail in db.ts (still needed after Supabase OTP verification)
- [x] Verify SignIn.tsx error messages show actual backend error (already uses err.message)
- [x] Verify build:server 0 errors
- [x] Verify 42/42 tests passing
- [x] Checkpoint and deliver full report

## Phase 47: Production Twilio Phone OTP Delivery
- [x] Audit all phone OTP, DEV/mock, console OTP, and SMS delivery paths
- [x] Replace production mock OTP delivery with Twilio Messaging Service delivery
- [x] Validate Twilio environment configuration and normalize phone numbers to E.164
- [x] Add safe Twilio diagnostics without logging OTPs or credentials in production
- [x] Ensure sendOtp returns success only after Twilio accepts the message
- [x] Add or update unit tests for Twilio delivery and production error handling
- [x] Verify compiled Railway server build and complete test suite
- [x] Save checkpoint and push the production fix to GitHub

## Phase 48: Phone OTP Resend Experience
- [x] Add a Resend OTP control on the phone verification screen
- [x] Show a 60-second countdown and disable resend during cooldown
- [x] Restart the timer only after a successful resend request
- [x] Verify client build, server build, and tests before checkpointing

## Phase 49: CookieYes Frontend Integration
- [x] Confirm the Vite HTML entry point and verify CookieYes is not already present
- [x] Add the provided CookieYes installation script once in the frontend document head
- [x] Verify the production Vite output contains one CookieYes script tag
- [x] Verify the live Vercel site loads the CookieYes script and keeps the frontend functional
- [x] Save checkpoint and push the frontend-only integration to GitHub

## Phase 50: CookieYes Cookie Policy Page
- [x] Audit existing public-policy page, routing, footer, and metadata patterns
- [x] Create or update the public /cookie-policy page with the CookieYes policy script scoped to that route
- [x] Add the Cookie Policy footer link and document title/description metadata
- [x] Verify script scope, responsive route behavior, TypeScript, tests, and split production builds
- [x] Save checkpoint and push the frontend-only change to GitHub

## Phase 51: Static Cookie Policy Replacement
- [x] Audit the current /cookie-policy implementation and existing global CookieYes consent API
- [x] Replace the dynamic CookieYes policy loader with the exact supplied static Cookie Policy content
- [x] Connect the Consent Preferences control to the existing CookieYes consent-management mechanism without creating a second banner
- [x] Verify script removal, public routing, accessibility, responsive rendering, TypeScript, tests, builds, and production behavior
- [x] Save checkpoint and push the frontend-only replacement to GitHub

## Phase 52: Enterprise User Role
- [x] Audit the current role schema, user/profile model, onboarding, sessions, authorization, routes, navigation, and dashboards
- [x] Design a backward-compatible Enterprise role migration using the existing role architecture
- [x] Add Enterprise validation, onboarding selection, session recognition, authorization policy support, dashboard routing, and role-aware navigation
- [x] Create a role-safe Enterprise dashboard without expanding into organization or team-management systems
- [x] Add regression tests for existing Professional and Contractor roles, Enterprise onboarding and dashboard routing, role-based navigation, and unauthorized access prevention
- [x] Run and verify TypeScript, full tests, client/server production builds, and the database migration
- [x] Save checkpoint, push the role expansion to GitHub, and report any manual operational steps

## Phase 53: Supabase Realtime Authentication Bridge
- [x] Add SUPABASE_JWT_SECRET to server environment configuration (`server/_core/env.ts`) and startup validation
- [x] Create server-side Realtime JWT generator (`server/_core/realtimeAuth.ts`) using jose, HS256, `SUPABASE_JWT_SECRET`, 30-minute expiration, and claims `{ sub: String(user.id), role: "authenticated", user_id: user.id }`
- [x] Create authenticated REST endpoint `GET /api/realtime/token` protected by existing session cookie and `sdk.authenticateRequest()`
- [x] Create browser-side Supabase client & Realtime helper (`client/src/lib/supabase.ts`) using public `SUPABASE_URL` and `SUPABASE_ANON_KEY`, calling `GET /api/realtime/token` with credentials: include, and calling `supabase.realtime.setAuth(token)` with automatic token refresh
- [x] Add unit tests for Realtime auth token generation, configuration validation, and endpoint security (`server/realtime-auth.test.ts`)
- [x] Run TypeScript check, test suite, `build:client`, and `build:server` successfully without breaking existing auth, schema, RLS, or messaging
- [x] Save checkpoint, publish, and report exact implementation details

## Phase 37: Production Auth Repair (Google OAuth & Email OTP)
- [x] Investigate and fix live Google OAuth OAUTH_STORAGE_UNAVAILABLE error (requestId 8CCF9561)
- [x] Investigate and fix email OTP "This code has expired or is invalid" verification error across all accounts
- [x] Verify production database connectivity and oauth_transactions table visibility under Railway runtime
- [x] Verify authoritative Supabase Auth OTP verification and normalization

## Phase 38: Definitive Production Authentication & Database Fix (pasted_content_72.txt)
- [x] Fix Railway container startup crash (ReferenceError: oauthRequestId is not defined in googleAuth.ts)
- [x] Prove production runtime PostgreSQL database identity and physically verify table oauth_transactions via DIRECT_DATABASE_URL migration
- [x] Restore mandatory, non-optional oauth_transactions persistence and atomic state/code claiming in Google OAuth
- [x] Consolidate Supabase Auth email OTP into one authoritative flow with strict case-insensitive email normalization
- [x] Fix session cookie clearing (remove deprecated maxAge from clearCookie) and route classification
- [x] Run full test suite, build verification, and live acceptance testing across multiple Google accounts and email OTP flows

## Phase 39: Comprehensive Auth Diagnostic & Repair (Google & Email Sign-Up)
- [x] Trace Google OAuth initiation, redirect URI, state validation, and token exchange across Railway runtime
- [x] Trace Supabase Auth email OTP send and verify pipeline across Supabase project configuration and frontend/backend integration
- [x] Diagnose why email OTP verification returns "This code has expired or is invalid"
- [x] Implement robust, production-safe fixes for both Google OAuth and email OTP authentication
- [x] Run full test suite, build checks, and verify zero errors

## Phase 40: Definitive Production Database & Authentication Reconciliation
- [x] Verify exact Railway runtime database identity and physical `oauth_transactions` table presence
- [x] Apply Drizzle/SQL migration strictly against `DIRECT_DATABASE_URL`
- [x] Restore authoritative, mandatory `oauth_transactions` persistence in Google OAuth (remove non-blocking try/catch bypass)
- [x] Consolidate email OTP into authoritative Supabase Auth flow with strict email normalization and no token-type fallback hacks
- [x] Audit session cookies (`Domain=.zylobridge.com`, `Secure`, `HttpOnly`, `SameSite=Lax`) and remove deprecated `maxAge` from `clearCookie`
- [x] Run comprehensive 5-attempt live acceptance testing for Google and email OTP flows across multiple accounts and edge cases

- [x] Diagnose and fix Google OAuth OAUTH_STORAGE_UNAVAILABLE error (requestId 22F4EBC4)
- [x] Verify oauth_transactions persistence and robust fallback handling in production
- [x] Run focused tests, type checks, full production builds, and verify deployment
- [x] Diagnose sign-in lag root cause across frontend redirection, Supabase OTP network roundtrips, database connection pooling, and Google OAuth exchange
- [x] Implement targeted latency optimizations (connection reuse, non-blocking sync calls, optimized UI loading indicators)

- [x] Implement Redis-backed session caching with seamless database fallback in server/_core/sdk.ts
- [x] Implement optimistic UI transitions and instant skeleton feedback on sign-in form submissions in client/src/pages/SignIn.tsx
- [x] Configure aggressive caching headers for static assets in vercel.json (or build config)
- [x] Run type checks, tests, and production build verification

- [x] Audit Railway logs for sign-in failures ("Missing session cookie", token expired/invalid, deprecated maxAge in clearCookie)
- [x] Optimize cookie options, CORS/credentials, and authentication context handling in server/_core/sdk.ts and routers.ts
- [x] Fix deprecated maxAge warning in Express res.clearCookie calls across server codebase
- [x] Run test suite, production build, and verification checks

- [x] Implement Super Admin real-time session analytics and error tracking endpoints and UI
- [x] Implement Web Push API notification registration, preference toggle, and job-match push trigger
- [x] Add Playwright end-to-end authentication tests for Google and OTP flows
- [x] Run test suite, production build, and verification checks

- [x] Fix Google OAuth upstream token exchange error handling and prompt parameter for multi-account selection
- [x] Fix logout / session clearing to properly remove local storage and invalidate cached session state
- [x] Remove deprecated maxAge parameter from res.clearCookie across server codebase
- [x] Run test suite, production build, and verification checks

- [x] Implement session timeout warning and re-authentication toast in client
- [x] Implement automated 30-day audit log retention cleanup procedure and scheduled endpoint
- [x] Expand Playwright E2E tests for multi-account sign-in workflows
- [x] Run test suite, production build, and verification checks

- [x] Register audit log retention cron job via manus-heartbeat CLI / SDK
- [x] Configure Sentry error monitoring instrumentation in server and client
- [x] Create weekly staging smoke test script and schedule configuration
- [x] Run test suite, production build, and verification checks
