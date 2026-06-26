-- Crear torneo SUMA 12 (Fin de Semana) - Versión sin DO/DECLARE
BEGIN;

-- 1) Insertar torneo
INSERT INTO torneo (
  nombre_torneo, fecha_inicio, fecha_fin, fecha_cierre_inscripcion, max_equipos,
  categoria_id, formato_categoria, suma_categoria, modalidad, dias_juego
) VALUES (
  'Torneo SUMA 12 - Fin de Semana',
  '2026-05-30'::date, '2026-05-31'::date, '2026-05-29'::date, 12,
  NULL, 'suma', 12, 'fin_de_semana', 'sabado,domingo'
);

-- 2) Insertar 24 jugadores
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

-- 3) Crear 12 equipos emparejando por orden de id_jugador
WITH players AS (
  SELECT id_jugador, ROW_NUMBER() OVER (ORDER BY id_jugador) AS rn
  FROM jugador
  WHERE email LIKE 'suma12_%'
)
INSERT INTO equipo (jugador1_id, jugador2_id, nombre_equipo)
SELECT p1.id_jugador, p2.id_jugador, 'Equipo SUMA12 ' || ((p1.rn + 1)/2)
FROM players p1
JOIN players p2 ON p2.rn = p1.rn + 1
WHERE (p1.rn % 2) = 1
ORDER BY p1.rn;

-- 4) Inscribir esos equipos en el torneo creado
INSERT INTO inscripcion (id_equipo, id_torneo)
SELECT e.id_equipo, t.id_torneo
FROM equipo e
CROSS JOIN (SELECT id_torneo FROM torneo WHERE nombre_torneo = 'Torneo SUMA 12 - Fin de Semana' LIMIT 1) t
WHERE e.nombre_equipo LIKE 'Equipo SUMA12 %';

COMMIT;
