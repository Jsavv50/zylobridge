# Zylobridge — Canonical Domain Model

**Author:** Manus AI  
**Date:** August 20, 2026  
**Status:** Phase 0 Architecture Audit Complete  

---

## 1. Overview

This document defines the canonical database entities and relationships across Zylobridge without introducing duplicate models or competing tables. All entities map directly to `drizzle/schema.ts`.

---

## 2. Core Domain Entities & Relationships

1. **Users (`users`)**: Canonical user identity table storing email, phone, hashed password, role (`user`, `admin`, `SUPER_ADMIN`), and verification status. Referenced by all user-bound tables via integer `id`.
2. **Profiles (`profiles`)**: Extends users with professional headline, bio, hourly rate, vocational category, skills, and geographic coordinates (`latitude`, `longitude`).
3. **Organizations (`organizations`) & Members (`organization_members`)**: Enterprise structure supporting company accounts, role permissions (`OWNER`, `ADMIN`, `MEMBER`, `RECRUITER`), and secure workspace isolation.
4. **Jobs (`jobs`)**: Core job postings linked to a client or organization, specifying vocation, budget, location, and status (`open`, `in_progress`, `completed`, `cancelled`).
5. **Applications (`applications`)**: Professional submissions to jobs carrying pipeline status (`pending`, `reviewing`, `shortlisted`, `hired`, `rejected`).
6. **Conversations (`conversations`) & Messages (`messages`)**: Messaging foundation bound to jobs and participants, delivering via Supabase Realtime private channels.
7. **Interviews (`interviews`) & Offers (`offers`)**: Structured hiring coordination tables tracking interview schedules, ICS metadata, and employment offers.
8. **Engagements (`engagements`) & Milestones (`escrow_payments`)**: Active work contracts and double-entry funded milestone payment tracking.
9. **Financial Records (`payment_transactions`, `payouts`, `refunds`, `disputes`, `ledgers`)**: Paystack transaction audit trail, double-entry ledger balancing engine, and arbitration.
10. **System Operations (`audit_logs`, `background_jobs`, `notifications`, `notification_delivery_logs`)**: Security tracking, durable background queues, and unified multi-channel notification dispatch.
