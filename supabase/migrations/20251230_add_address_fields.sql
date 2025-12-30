-- Add detailed address fields to users table
-- These fields allow users to save their complete address information

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

COMMENT ON COLUMN users.street_address IS 'Street address including apartment/unit number';
COMMENT ON COLUMN users.city IS 'City name';
COMMENT ON COLUMN users.state IS 'State, province, or region';
COMMENT ON COLUMN users.postal_code IS 'Postal or ZIP code';
COMMENT ON COLUMN users.country IS 'Country name';
