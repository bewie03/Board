-- Migration: Add funding pricing columns to platform_settings table
-- Date: 2024-01-XX
-- Description: Adds funding campaign pricing settings to support admin panel management

-- Add funding pricing columns
ALTER TABLE platform_settings 
ADD COLUMN IF NOT EXISTS funding_listing_fee DECIMAL(10,2) DEFAULT 500.00,
ADD COLUMN IF NOT EXISTS funding_listing_fee_ada DECIMAL(10,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS funding_listing_currency VARCHAR(10) DEFAULT 'BONE' CHECK (funding_listing_currency IN ('ADA', 'BONE')),
ADD COLUMN IF NOT EXISTS project_listing_fee_ada DECIMAL(10,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS job_listing_fee_ada DECIMAL(10,2) DEFAULT 25.00;

-- Update existing records to include new funding pricing
UPDATE platform_settings 
SET 
    funding_listing_fee = 500.00,
    funding_listing_fee_ada = 50.00,
    funding_listing_currency = 'BONE',
    project_listing_fee_ada = COALESCE(project_listing_fee_ada, 50.00),
    job_listing_fee_ada = COALESCE(job_listing_fee_ada, 25.00)
WHERE funding_listing_fee IS NULL;

-- Create index for funding pricing queries
CREATE INDEX IF NOT EXISTS idx_platform_settings_funding ON platform_settings(funding_listing_fee, funding_listing_currency);
