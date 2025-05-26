-- Update Brands Table for Verification System
-- Add verification-related columns to the brands table

-- Add verification status column
ALTER TABLE dbo.brands 
ADD COLUMN verification_status VARCHAR(20) DEFAULT 'not_submitted' 
CHECK (verification_status IN ('not_submitted', 'pending', 'approved', 'rejected'));

-- Add verification timestamps
ALTER TABLE dbo.brands 
ADD COLUMN verification_submitted_at TIMESTAMP;

ALTER TABLE dbo.brands 
ADD COLUMN verification_approved_at TIMESTAMP;

-- Add verification documents/info columns
ALTER TABLE dbo.brands 
ADD COLUMN business_registration VARCHAR(500);

ALTER TABLE dbo.brands 
ADD COLUMN website VARCHAR(500);

ALTER TABLE dbo.brands 
ADD COLUMN social_media TEXT;

ALTER TABLE dbo.brands 
ADD COLUMN additional_verification_info TEXT;

-- Add verification notes (for admin feedback)
ALTER TABLE dbo.brands 
ADD COLUMN verification_notes TEXT;

-- Create indexes for verification queries
CREATE INDEX IF NOT EXISTS idx_brands_verification_status ON dbo.brands(verification_status);
CREATE INDEX IF NOT EXISTS idx_brands_verification_submitted ON dbo.brands(verification_submitted_at);

-- Update existing brands to have default verification status
UPDATE dbo.brands 
SET verification_status = 'not_submitted' 
WHERE verification_status IS NULL; 