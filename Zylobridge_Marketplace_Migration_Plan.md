# Zylobridge — Marketplace Migration Plan

**Author:** Manus AI  
**Date:** August 20, 2026  
**Status:** Phase 0 Architecture Audit Complete  

---

## 1. Overview

This document outlines the forward-only, additive database migration strategy for Zylobridge. All future schema modifications must adhere strictly to additive principles without altering or dropping existing tables, maintaining absolute backward compatibility with existing user sessions, auth records, ledgers, and messaging.

---

## 2. Migration Governance & Rules

1. **Additive Only**: Schema expansions must create new tables or append optional columns to existing tables using Drizzle ORM and numbered SQL migration scripts.
2. **No Destructive Operations**: `DROP TABLE` or `ALTER COLUMN DROP` statements are strictly prohibited in production pathways.
3. **Index Optimization**: Foreign key columns and high-frequency filter fields must have corresponding indexes created concurrently.
4. **RLS & Security**: Row Level Security policies must be verified against server-side authorization helpers before deployment.
