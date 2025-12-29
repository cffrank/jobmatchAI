-- =============================================================================
-- Migration: 015_add_address_fields_to_users.sql
-- Description: Add address fields to users table for resume and job search
-- =============================================================================

-- Add address columns to users table
ALTER TABLE users
ADD COLUMN street_address TEXT,
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN postal_code TEXT,
ADD COLUMN country TEXT;

-- Add indexes for location-based queries
CREATE INDEX idx_users_city ON users(city) WHERE city IS NOT NULL;
CREATE INDEX idx_users_state ON users(state) WHERE state IS NOT NULL;
CREATE INDEX idx_users_country ON users(country) WHERE country IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.street_address IS 'Street address (e.g., 123 Main St, Apt 4B)';
COMMENT ON COLUMN users.city IS 'City name';
COMMENT ON COLUMN users.state IS 'State/Province/Region';
COMMENT ON COLUMN users.postal_code IS 'ZIP/Postal code';
COMMENT ON COLUMN users.country IS 'Country name';

-- Create helper function to get formatted address
CREATE OR REPLACE FUNCTION get_formatted_address(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_address TEXT;
  v_user RECORD;
BEGIN
  SELECT
    street_address,
    city,
    state,
    postal_code,
    country
  INTO v_user
  FROM users
  WHERE id = p_user_id;

  -- Build address string with available components
  v_address := '';

  IF v_user.street_address IS NOT NULL THEN
    v_address := v_user.street_address;
  END IF;

  IF v_user.city IS NOT NULL THEN
    IF v_address != '' THEN
      v_address := v_address || ', ';
    END IF;
    v_address := v_address || v_user.city;
  END IF;

  IF v_user.state IS NOT NULL THEN
    IF v_address != '' THEN
      v_address := v_address || ', ';
    END IF;
    v_address := v_address || v_user.state;
  END IF;

  IF v_user.postal_code IS NOT NULL THEN
    IF v_address != '' THEN
      v_address := v_address || ' ';
    END IF;
    v_address := v_address || v_user.postal_code;
  END IF;

  IF v_user.country IS NOT NULL THEN
    IF v_address != '' THEN
      v_address := v_address || ', ';
    END IF;
    v_address := v_address || v_user.country;
  END IF;

  RETURN NULLIF(v_address, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_formatted_address IS 'Returns formatted address string for a user';

-- Grant execute on helper function
GRANT EXECUTE ON FUNCTION get_formatted_address TO authenticated;

-- =============================================================================
-- Migration Summary
-- =============================================================================
--
-- Added columns:
--   - street_address (TEXT): Street address with apartment/unit
--   - city (TEXT): City name
--   - state (TEXT): State/Province/Region
--   - postal_code (TEXT): ZIP/Postal code
--   - country (TEXT): Country name
--
-- Indexes:
--   - idx_users_city: For city-based searches
--   - idx_users_state: For state-based searches
--   - idx_users_country: For country-based searches
--
-- Functions:
--   - get_formatted_address(user_id): Returns formatted address string
--
-- =============================================================================
