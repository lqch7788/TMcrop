-- Migration: Add batch_code to harvest_records for direct batch association
-- This enables yield stats to directly join to production_plans via batch_code
-- without relying on the indirect source_id chain (seedlings -> plantings -> harvest_records)
ALTER TABLE harvest_records ADD COLUMN batch_code TEXT;
