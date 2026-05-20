-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- PostGIS (Sprint 0 / ADR-016 — spatial features in Sprint 9)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify the extension is installed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    RAISE EXCEPTION 'TimescaleDB extension not installed';
  END IF;
END;
$$;
