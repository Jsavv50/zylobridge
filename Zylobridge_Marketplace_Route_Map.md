# Zylobridge — Marketplace Route Map

**Author:** Manus AI  
**Date:** August 20, 2026  
**Status:** Phase 0 Architecture Audit Complete  

---

## 1. Overview

This document specifies the canonical route architecture for the Zylobridge frontend application, mapping cleanly to existing React components and routers.

---

## 2. Canonical Route Specification

- `/` — Marketplace Home & Landing (`client/src/pages/Home.tsx`)
- `/jobs` — Job Discovery & Marketplace (`client/src/pages/Marketplace.tsx`)
- `/jobs/:jobId` — Job Details (`client/src/pages/JobDetail.tsx`)
- `/talent` — Professional Discovery Directory
- `/professionals/:id` — Professional Profile View (`client/src/pages/UserProfile.tsx`)
- `/jobs/new` — Job Posting (`client/src/pages/JobPosting.tsx`)
- `/employer/jobs` — Employer Job Management
- `/applications` — Professional Application Pipeline (`client/src/pages/Orders.tsx` / Applications view)
- `/messages` — Real-time Messaging & Collaboration (`client/src/pages/Messaging.tsx`)
- `/interviews` — Interview Schedule & Video Rooms
- `/offers` — Offer Management & Acceptance
- `/contracts/:contractId` — Engagement Contract & Milestone Tracking
- `/work/:contractId` — Active Workspace & Milestone Submissions
- `/payments` — Payment History & Escrow Management
- `/reviews` — Reputation & Review Management
- `/verification` — Identity & Document Verification (`client/src/pages/VerificationRequest.tsx`)
- `/dashboard` — Professional Dashboard (`client/src/pages/ProfessionalDashboard.tsx`)
- `/employer` — Employer Dashboard (`client/src/pages/ClientDashboard.tsx`)
- `/enterprise` — Enterprise Organization Workspace (`client/src/pages/EnterpriseDashboard.tsx`)
- `/enterprise/analytics` — Enterprise Reporting & Intelligence
- `/notifications` — Unified Notification Center
- `/admin` — Super Admin Operations & Audit Logs (`client/src/pages/AdminDashboard.tsx`)
