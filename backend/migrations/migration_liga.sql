
-- Migration to add League Modality fields

ALTER TABLE torneo 
ADD COLUMN modalidad VARCHAR(50) DEFAULT 'fin_de_semana' CHECK (modalidad IN ('fin_de_semana', 'liga')),
ADD COLUMN dias_juego VARCHAR(255);

-- Update existing records to have default
UPDATE torneo SET modalidad = 'fin_de_semana';
