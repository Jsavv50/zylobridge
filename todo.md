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
