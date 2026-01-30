
-- Migration for League Auto-Schedule

-- 1. Add date column to matches
ALTER TABLE partidos_grupo ADD COLUMN fecha DATE;

-- 2. Make tournament end date nullable (calculated automatically for Leagues)
ALTER TABLE torneo ALTER COLUMN fecha_fin DROP NOT NULL;
