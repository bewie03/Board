-- Migration: Add selected_project_id column to job_listings table
-- This fixes the job verification bug where any job from a wallet with verified projects shows as verified

ALTER TABLE job_listings 
ADD COLUMN selected_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_job_listings_selected_project_id ON job_listings(selected_project_id);

-- Add comment explaining the purpose
COMMENT ON COLUMN job_listings.selected_project_id IS 'Tracks when user explicitly selects a verified project during job posting. Only jobs with this field set should inherit project verification status.';
