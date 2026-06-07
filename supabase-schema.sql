-- =============================================
-- 海鮮圖鑑 Supabase Schema
-- Run this in your Supabase SQL editor
-- =============================================

-- Create fishes table
CREATE TABLE IF NOT EXISTS fishes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Basic info
  name TEXT NOT NULL,
  scientific_name TEXT,
  category TEXT DEFAULT '魚',  -- 魚/蝦/蟹/貝/花枝/章魚/其他

  -- AI-generated fields
  flavor TEXT,
  texture TEXT,
  market_price NUMERIC,        -- 台幣/台斤
  cooking_methods TEXT,
  aging_days INTEGER,
  sashimi_grade BOOLEAN,
  habitat_depth NUMERIC,       -- 公尺

  -- Media
  photos TEXT[] DEFAULT '{}',  -- Array of storage URLs

  -- Extra
  description TEXT
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fishes_updated_at
  BEFORE UPDATE ON fishes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_fishes_name ON fishes USING gin(to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_fishes_category ON fishes(category);
CREATE INDEX IF NOT EXISTS idx_fishes_habitat_depth ON fishes(habitat_depth);
CREATE INDEX IF NOT EXISTS idx_fishes_created_at ON fishes(created_at DESC);

-- RLS Policies (adjust as needed)
ALTER TABLE fishes ENABLE ROW LEVEL SECURITY;

-- Allow all reads (for share page)
CREATE POLICY "Public read" ON fishes FOR SELECT USING (true);

-- Allow all writes (add auth if needed later)
CREATE POLICY "Public insert" ON fishes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON fishes FOR UPDATE USING (true);

-- =============================================
-- Storage bucket for fish photos
-- =============================================
-- Run in Supabase dashboard > Storage:
-- 1. Create bucket named: fish-photos
-- 2. Set to Public
-- 3. Add policy: Allow all uploads (or restrict by auth)
