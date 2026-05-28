-- =============================================
-- TRIPGENIE — server/db/schema.sql
-- À exécuter dans Supabase > SQL Editor
-- =============================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- USERS ----
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ---- TRIPS (itinéraires sauvegardés) ----
CREATE TABLE IF NOT EXISTS trips (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  destination   TEXT NOT NULL,
  country       TEXT,
  origin        TEXT,
  departure     DATE,
  return_date   DATE,
  travelers     INT DEFAULT 1,
  budget        TEXT,
  mode          TEXT CHECK (mode IN ('party','student','luxury','group','relax','surprise')),
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft','confirmed','archived')),
  score         FLOAT,
  pack_data     JSONB,        -- Le pack complet généré (vols, hotel, activités...)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ---- TABLE DES VOTES (CONSENSUS) ----
CREATE TABLE IF NOT EXISTS public.trip_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL, 
    voter_name TEXT,       
    vote_type BOOLEAN NOT NULL, 
    created_at TIMESTAMPTZ DEFAULT now()
);


-- ---- INDEX ----
CREATE INDEX IF NOT EXISTS idx_trips_user_id   ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_mode      ON trips(mode);
CREATE INDEX IF NOT EXISTS idx_votes_trip_id   ON trip_votes(trip_id);

-- ---- RLS (Row Level Security) ----
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips             ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_votes        ENABLE ROW LEVEL SECURITY;

-- Policy : chaque user voit seulement ses données
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (id = auth.uid());

CREATE POLICY "trips_own_data" ON trips
  FOR ALL USING (user_id = auth.uid());


-- Policy Votes : tout le monde peut voter et voir les votes (lien de partage)
CREATE POLICY "votes_insert_all" ON trip_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "votes_select_all" ON trip_votes FOR SELECT USING (true);
