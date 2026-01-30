
-- Add games statistics columns
ALTER TABLE equipos_grupo 
ADD COLUMN games_favor INT DEFAULT 0,
ADD COLUMN games_contra INT DEFAULT 0;

-- Reset statistics because sets_favor previously contained games count
UPDATE equipos_grupo 
SET sets_favor = 0, sets_contra = 0, games_favor = 0, games_contra = 0;
