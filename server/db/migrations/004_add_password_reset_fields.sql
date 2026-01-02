-- Migration: Add password reset token fields to users table
-- This migration adds password_reset_token and password_reset_token_expiry columns
-- to support the password reset functionality

-- Add password_reset_token column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_reset_token TEXT;

-- Add password_reset_token_expiry column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_reset_token_expiry TIMESTAMP;

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token
ON users(password_reset_token)
WHERE password_reset_token IS NOT NULL;
