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
- [ ] Scan every .ts/.tsx/.js/.mjs file for broken imports and unresolved aliases
- [ ] Simulate exact Vercel serverless build (esbuild bundle of api/index.ts with alias resolution)
- [ ] Fix every broken import: @shared/_core, relative paths, missing modules
- [ ] Run production build with zero ERR_MODULE_NOT_FOUND errors
- [ ] Verify 0 TypeScript errors and all tests passing
- [ ] Save checkpoint and push to GitHub

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
