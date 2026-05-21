-- Patch migration to add fields required by current backend routes.
-- Ejecutar este archivo manualmente si la base de datos existente no tiene estas columnas.

ALTER TABLE torneo ADD COLUMN IF NOT EXISTS modalidad VARCHAR(50) DEFAULT 'fin_de_semana' CHECK (modalidad IN ('fin_de_semana', 'liga'));
ALTER TABLE torneo ADD COLUMN IF NOT EXISTS dias_juego VARCHAR(255);
ALTER TABLE jugador ADD COLUMN IF NOT EXISTS foto_perfil TEXT;
ALTER TABLE equipos_grupo ADD COLUMN IF NOT EXISTS games_favor INT DEFAULT 0;
ALTER TABLE equipos_grupo ADD COLUMN IF NOT EXISTS games_contra INT DEFAULT 0;
ALTER TABLE partidos_grupo ADD COLUMN IF NOT EXISTS fecha TIMESTAMP;
