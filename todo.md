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
