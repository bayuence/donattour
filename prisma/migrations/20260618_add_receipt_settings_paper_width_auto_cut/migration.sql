-- Migration: Add receipt settings paper width and auto cut support
-- Generated: 2026-06-18
-- Safe: only adds new columns

ALTER TABLE receipt_settings
  ADD COLUMN IF NOT EXISTS paper_width VARCHAR(10) DEFAULT '58mm',
  ADD COLUMN IF NOT EXISTS enable_auto_cut BOOLEAN DEFAULT false;
