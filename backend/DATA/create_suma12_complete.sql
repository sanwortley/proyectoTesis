-- Crear torneo SUMA 12 con 32 equipos
BEGIN;

-- 1. Crear torneo
INSERT INTO torneo (nombre_torneo, fecha_inicio, fecha_fin, fecha_cierre_inscripcion, max_equipos, categoria_id, formato_categoria, suma_categoria)
VALUES ('SUMA 12 Profesional', '2026-03-20', '2026-04-05', '2026-03-15', 32, NULL, 'suma', 12);

-- Obtener el ID del torneo recién creado
DO $$
DECLARE
    torneo_id INT;
BEGIN
    SELECT id_torneo INTO torneo_id FROM torneo WHERE nombre_torneo = 'SUMA 12 Profesional' ORDER BY id_torneo DESC LIMIT 1;

    -- 2. Crear 32 equipos
    INSERT INTO equipo (jugador1_id, jugador2_id, nombre_equipo) VALUES
    (NULL, NULL, 'Martín/González'), (NULL, NULL, 'Lucas/Rodríguez'),
    (NULL, NULL, 'Santiago/Fernández'), (NULL, NULL, 'Mateo/López'),
    (NULL, NULL, 'Benjamín/Martínez'), (NULL, NULL, 'Nicolás/Sánchez'),
    (NULL, NULL, 'Tomás/Pérez'), (NULL, NULL, 'Agustín/Gómez'),
    (NULL, NULL, 'Franco/Díaz'), (NULL, NULL, 'Joaquín/Álvarez'),
    (NULL, NULL, 'Juan/Romero'), (NULL, NULL, 'Ignacio/Torres'),
    (NULL, NULL, 'Valentino/Ruiz'), (NULL, NULL, 'Felipe/Ramírez'),
    (NULL, NULL, 'Bautista/Flores'), (NULL, NULL, 'Diego/Castro'),
    (NULL, NULL, 'Emiliano/Moreno'), (NULL, NULL, 'Thiago/Jiménez'),
    (NULL, NULL, 'Lautaro/Muñoz'), (NULL, NULL, 'Ian/Hernández'),
    (NULL, NULL, 'Gael/Vargas'), (NULL, NULL, 'Emanuel/Reyes'),
    (NULL, NULL, 'Axel/Medina'), (NULL, NULL, 'Maximiliano/Cruz'),
    (NULL, NULL, 'Bruno/Guerrero'), (NULL, NULL, 'Luca/Mendoza'),
    (NULL, NULL, 'Dante/Ramos'), (NULL, NULL, 'Facundo/Núñez'),
    (NULL, NULL, 'Tobías/Vega'), (NULL, NULL, 'Ezequiel/Guzmán'),
    (NULL, NULL, 'Matías/Molina'), (NULL, NULL, 'Rodrigo/Aguilar');

    -- 3. Inscribir equipos al torneo (últimos 32 creados)
    INSERT INTO inscripcion (id_torneo, id_equipo, estado_pago)
    SELECT torneo_id, id_equipo, 'confirmado'
    FROM equipo
    WHERE nombre_equipo IN (
        'Martín/González', 'Lucas/Rodríguez', 'Santiago/Fernández', 'Mateo/López',
        'Benjamín/Martínez', 'Nicolás/Sánchez', 'Tomás/Pérez', 'Agustín/Gómez',
        'Franco/Díaz', 'Joaquín/Álvarez', 'Juan/Romero', 'Ignacio/Torres',
        'Valentino/Ruiz', 'Felipe/Ramírez', 'Bautista/Flores', 'Diego/Castro',
        'Emiliano/Moreno', 'Thiago/Jiménez', 'Lautaro/Muñoz', 'Ian/Hernández',
        'Gael/Vargas', 'Emanuel/Reyes', 'Axel/Medina', 'Maximiliano/Cruz',
        'Bruno/Guerrero', 'Luca/Mendoza', 'Dante/Ramos', 'Facundo/Núñez',
        'Tobías/Vega', 'Ezequiel/Guzmán', 'Matías/Molina', 'Rodrigo/Aguilar'
    );

    RAISE NOTICE 'Torneo creado con ID: %', torneo_id;
END $$;

COMMIT;
