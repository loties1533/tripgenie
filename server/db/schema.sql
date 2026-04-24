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

-- ---- PACKS (options générées, top 3 par recherche) ----
CREATE TABLE IF NOT EXISTS packs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id       UUID REFERENCES trips(id) ON DELETE CASCADE,
  rank          INT,          -- 1, 2 ou 3
  score         FLOAT,
  flight_data   JSONB,
  hotel_data    JSONB,
  events_data   JSONB,
  activities    JSONB,
  budget_breakdown JSONB,
  selected      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- PREFERENCES utilisateur ----
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_mode  TEXT DEFAULT 'party',
  preferred_prefs TEXT[],     -- ['gastronomie', 'culture', ...]
  home_city     TEXT,
  currency      TEXT DEFAULT 'EUR',
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

-- ---- TABLE DE RELATION MANY-TO-MANY (COLLABORATEURS) ----
-- Permet de lier plusieurs utilisateurs à plusieurs voyages
CREATE TABLE IF NOT EXISTS public.trip_collaborators (
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'editor', -- 'viewer' | 'editor'
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (trip_id, user_id) -- Clé primaire composée (Style Holberton)
);

-- ---- INDEX ----
CREATE INDEX IF NOT EXISTS idx_trips_user_id   ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_mode      ON trips(mode);
CREATE INDEX IF NOT EXISTS idx_packs_trip_id   ON packs(trip_id);
CREATE INDEX IF NOT EXISTS idx_votes_trip_id   ON trip_votes(trip_id);

-- ---- RLS (Row Level Security) ----
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips             ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_votes        ENABLE ROW LEVEL SECURITY;

-- Policy : chaque user voit seulement ses données
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (id = auth.uid());

CREATE POLICY "trips_own_data" ON trips
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "packs_own_data" ON packs
  FOR ALL USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

-- Policy Votes : tout le monde peut voter et voir les votes (lien de partage)
CREATE POLICY "votes_insert_all" ON trip_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "votes_select_all" ON trip_votes FOR SELECT USING (true);
