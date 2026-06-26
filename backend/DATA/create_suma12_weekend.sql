-- Crear torneo SUMA 12 (Fin de Semana)
BEGIN;

DO $$
DECLARE
  torneo_id INT;
BEGIN
  INSERT INTO torneo (
    nombre_torneo, fecha_inicio, fecha_fin, fecha_cierre_inscripcion, max_equipos,
    categoria_id, formato_categoria, suma_categoria, modalidad, dias_juego
  ) VALUES (
    'Torneo SUMA 12 - Fin de Semana',
    '2026-05-30'::date, '2026-05-31'::date, '2026-05-29'::date, 12,
    NULL, 'suma', 12, 'fin_de_semana', 'sabado,domingo'
  ) RETURNING id_torneo INTO torneo_id;

  RAISE NOTICE 'Creando Torneo SUMA 12 con ID: %', torneo_id;

  -- Insertar 24 jugadores (nombres reales de ejemplo)
  INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password)
  VALUES
    ('Juan','Pérez','suma12_1@example.com','11-4000-0101','pass123'),
    ('Luis','Gómez','suma12_2@example.com','11-4000-0102','pass123'),
    ('Martín','Rodríguez','suma12_3@example.com','11-4000-0103','pass123'),
    ('Sergio','López','suma12_4@example.com','11-4000-0104','pass123'),
    ('Federico','García','suma12_5@example.com','11-4000-0105','pass123'),
    ('Diego','Fernández','suma12_6@example.com','11-4000-0106','pass123'),
    ('Gabriel','Martínez','suma12_7@example.com','11-4000-0107','pass123'),
    ('Santiago','González','suma12_8@example.com','11-4000-0108','pass123'),
    ('Matías','Suárez','suma12_9@example.com','11-4000-0109','pass123'),
    ('Nicolás','Torres','suma12_10@example.com','11-4000-0110','pass123'),
    ('Joaquín','Ramírez','suma12_11@example.com','11-4000-0111','pass123'),
    ('Lucas','Vargas','suma12_12@example.com','11-4000-0112','pass123'),
    ('Facundo','Ramos','suma12_13@example.com','11-4000-0113','pass123'),
    ('Agustín','Romero','suma12_14@example.com','11-4000-0114','pass123'),
    ('Ezequiel','Castro','suma12_15@example.com','11-4000-0115','pass123'),
    ('Bruno','Herrera','suma12_16@example.com','11-4000-0116','pass123'),
    ('Emiliano','Molina','suma12_17@example.com','11-4000-0117','pass123'),
    ('Thiago','Rossi','suma12_18@example.com','11-4000-0118','pass123'),
    ('Lautaro','Marin','suma12_19@example.com','11-4000-0119','pass123'),
    ('Ian','Suarez','suma12_20@example.com','11-4000-0120','pass123'),
    ('Emanuel','Diaz','suma12_21@example.com','11-4000-0121','pass123'),
    ('Axel','Ortega','suma12_22@example.com','11-4000-0122','pass123'),
    ('Maximiliano','Silva','suma12_23@example.com','11-4000-0123','pass123'),
    ('Dante','Suarez','suma12_24@example.com','11-4000-0124','pass123');

  -- Crear 12 equipos uniendo jugadores por orden de inserción (emails suma12_1..suma12_24)
  DO $$
  DECLARE
    r RECORD;
    p1 INT;
    p2 INT;
    t_id INT := torneo_id;
    idx INT := 0;
  BEGIN
    FOR r IN (
      SELECT id_jugador FROM jugador WHERE email LIKE 'suma12_%' ORDER BY id_jugador
    ) LOOP
      idx := idx + 1;
      IF (idx % 2) = 1 THEN
        p1 := r.id_jugador;
      ELSE
        p2 := r.id_jugador;
        INSERT INTO equipo (jugador1_id, jugador2_id, nombre_equipo)
        VALUES (p1, p2, 'Equipo SUMA12 ' || (idx/2));
        -- usar la secuencia existente para currval
        INSERT INTO inscripcion (id_equipo, id_torneo)
        VALUES (currval('equipo_id_equipo_seq'), t_id);
      END IF;
    END LOOP;
  END $$;

  RAISE NOTICE 'Se han creado 12 equipos e inscripciones para torneo %', torneo_id;
END $$;

COMMIT;
