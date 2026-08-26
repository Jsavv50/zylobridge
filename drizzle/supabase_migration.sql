-- ============================================================
-- ZYLOBRIDGE — Supabase PostgreSQL Schema Migration
-- Run this in: https://supabase.com/dashboard/project/ztasdzkunkhfrnxmnmzq/sql
-- Safe to run multiple times (uses IF NOT EXISTS / DO EXCEPTION blocks)
-- ============================================================

-- ─── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE role AS ENUM ('user', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE user_type AS ENUM ('client', 'professional', 'unset'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE vocation AS ENUM ('electrician','carpenter','plumber','mason_bricklayer','painter','flooring_tiler','heavy_equipment_operator','road_construction_worker','hvac_technician','elevator_installer_repairer','pest_control_technician','glazier'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE job_status AS ENUM ('open','in_progress','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE application_status AS ENUM ('pending','accepted','rejected','withdrawn'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('paystack','bank_transfer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE escrow_status AS ENUM ('pending','funded','released','refunded','disputed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE document_type AS ENUM ('trade_licence','certification','government_id','insurance_certificate','guild_membership'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE verification_status AS ENUM ('pending','approved','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('pending','paid','failed','refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  "loginMethod" VARCHAR(64),
  role role NOT NULL DEFAULT 'user',
  "userType" user_type NOT NULL DEFAULT 'unset',
  phone VARCHAR(20),
  "avatarUrl" TEXT,
  "isVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Professional Profiles ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  vocation vocation NOT NULL,
  bio TEXT,
  skills TEXT,
  certifications TEXT,
  "portfolioUrl" TEXT,
  "hourlyRate" NUMERIC(10,2),
  location VARCHAR(255),
  "yearsExperience" INTEGER,
  "averageRating" NUMERIC(3,2) DEFAULT 0.00,
  "totalReviews" INTEGER NOT NULL DEFAULT 0,
  "isAvailable" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Jobs ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  "clientId" INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  vocation vocation NOT NULL,
  budget NUMERIC(12,2) NOT NULL,
  location VARCHAR(255) NOT NULL,
  deadline TIMESTAMP,
  status job_status NOT NULL DEFAULT 'open',
  "assignedProfessionalId" INTEGER,
  "isUrgent" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Applications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  "jobId" INTEGER NOT NULL,
  "professionalId" INTEGER NOT NULL,
  "coverLetter" TEXT NOT NULL,
  "bidAmount" NUMERIC(12,2) NOT NULL,
  status application_status NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Reviews ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  "jobId" INTEGER NOT NULL,
  "reviewerId" INTEGER NOT NULL,
  "revieweeId" INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Conversations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  "jobId" INTEGER NOT NULL,
  "clientId" INTEGER NOT NULL,
  "professionalId" INTEGER NOT NULL,
  "lastMessageAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Messages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  "conversationId" INTEGER NOT NULL,
  "senderId" INTEGER NOT NULL,
  content TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Escrow Payments ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escrow_payments (
  id SERIAL PRIMARY KEY,
  "jobId" INTEGER NOT NULL,
  "clientId" INTEGER NOT NULL,
  "professionalId" INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  "paymentMethod" payment_method NOT NULL,
  status escrow_status NOT NULL DEFAULT 'pending',
  "paystackReference" VARCHAR(255),
  "paystackAccessCode" VARCHAR(255),
  "paystackAuthorizationUrl" TEXT,
  "bankAccountNumber" VARCHAR(20),
  "bankAccountName" VARCHAR(255),
  "bankName" VARCHAR(255),
  "transferProofUrl" TEXT,
  "transferProofKey" TEXT,
  "adminConfirmedBy" INTEGER,
  "paidAt" TIMESTAMP,
  "releasedAt" TIMESTAMP,
  "refundedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Verification Requests ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_requests (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "documentType" document_type NOT NULL,
  "documentUrl" TEXT NOT NULL,
  "documentKey" TEXT NOT NULL,
  status verification_status NOT NULL DEFAULT 'pending',
  "adminNote" TEXT,
  "reviewedAt" TIMESTAMP,
  "reviewedBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  "imageUrl" TEXT,
  "imageKey" TEXT,
  category VARCHAR(100),
  stock INTEGER NOT NULL DEFAULT -1,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  status order_status NOT NULL DEFAULT 'pending',
  "paystackReference" VARCHAR(255),
  "paystackAccessCode" VARCHAR(255),
  "paystackAuthorizationUrl" TEXT,
  "paidAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Email OTPs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_otps (
  id SERIAL PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  otp VARCHAR(8) NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Phone OTPs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS phone_otps (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Verification: confirm tables exist ──────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
