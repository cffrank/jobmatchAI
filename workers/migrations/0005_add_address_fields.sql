-- =====================================================================
-- Add Address Fields to Users Table
-- =====================================================================
-- Migration: 0002
-- Created: 2026-01-03
-- Purpose: Add detailed address fields (street, city, state, postal code, country)
--          to support full user profile information
-- =====================================================================

-- Add address columns to users table
ALTER TABLE users ADD COLUMN street_address TEXT;
ALTER TABLE users ADD COLUMN city TEXT;
ALTER TABLE users ADD COLUMN state TEXT;
ALTER TABLE users ADD COLUMN postal_code TEXT;
ALTER TABLE users ADD COLUMN country TEXT;

-- Note: SQLite doesn't support adding columns with NOT NULL constraint if table has data
-- All new columns are nullable, which is appropriate for optional address fields
