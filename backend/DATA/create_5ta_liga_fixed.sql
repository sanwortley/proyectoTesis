-- Script corregido: Torneo 5ta - Liga (Miércoles/Viernes) SIN DO $$ (pegalo en psql)
BEGIN;

-- 0) Aseguramos que exista la categoría 5ta (no duplica si ya existe)
INSERT INTO categoria (nombre, valor_numerico)
SELECT '5ta', 5
WHERE NOT EXISTS (SELECT 1 FROM categoria WHERE valor_numerico = 5);

-- 1) Insertar torneo (categoria referenciada por su valor_numerico)
INSERT INTO torneo (
  nombre_torneo, fecha_inicio, fecha_fin, fecha_cierre_inscripcion, max_equipos,
  categoria_id, formato_categoria, suma_categoria, modalidad, dias_juego
) VALUES (
  'Torneo 5ta Categoria - Liga (Miércoles/Viernes)',
  '2026-06-24'::date, '2026-08-07'::date, '2026-06-22'::date, 16,
  (SELECT id_categoria FROM categoria WHERE valor_numerico = 5),
  'categoria_fija', NULL, 'liga', 'miercoles,viernes'
);

-- 2) Insertar 32 jugadores reales (todos con categoria_id = 5ta)
INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password, categoria_id)
VALUES
  ('Juan','Pérez','juan.perez@example.com','11-4000-0001','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Luis','Gómez','luis.gomez@example.com','11-4000-0002','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Martín','Rodríguez','martin.rodriguez@example.com','11-4000-0003','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Sergio','López','sergio.lopez@example.com','11-4000-0004','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Federico','García','federico.garcia@example.com','11-4000-0005','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Diego','Fernández','diego.fernandez@example.com','11-4000-0006','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Gabriel','Martínez','gabriel.martinez@example.com','11-4000-0007','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Santiago','González','santiago.gonzalez@example.com','11-4000-0008','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Matías','Suárez','matias.suarez@example.com','11-4000-0009','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Nicolás','Torres','nicolas.torres@example.com','11-4000-0010','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Joaquín','Ramírez','joaquin.ramirez@example.com','11-4000-0011','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Lucas','Vargas','lucas.vargas@example.com','11-4000-0012','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Facundo','Ramos','facundo.ramos@example.com','11-4000-0013','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Agustín','Romero','agustin.romero@example.com','11-4000-0014','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Ezequiel','Castro','ezequiel.castro@example.com','11-4000-0015','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Bruno','Herrera','bruno.herrera@example.com','11-4000-0016','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Emiliano','Molina','emiliano.molina@example.com','11-4000-0017','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Thiago','Rossi','thiago.rossi@example.com','11-4000-0018','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Lautaro','Marin','lautaro.marin@example.com','11-4000-0019','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Ian','Suarez','ian.suarez@example.com','11-4000-0020','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Bruno','Cruz','bruno.cruz@example.com','11-4000-0021','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Emanuel','Diaz','emanuel.diaz@example.com','11-4000-0022','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Axel','Ortega','axel.ortega@example.com','11-4000-0023','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Maximiliano','Silva','maximiliano.silva@example.com','11-4000-0024','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Dante','Suarez','dante.suarez@example.com','11-4000-0025','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Luca','Vega','luca.vega@example.com','11-4000-0026','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Tobías','Núñez','tobias.nunez@example.com','11-4000-0027','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Ezequiel','Morales','ezequiel.morales@example.com','11-4000-0028','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Matías','Méndez','matias.mendez@example.com','11-4000-0029','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Rodrigo','Aguirre','rodrigo.aguirre@example.com','11-4000-0030','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Valentino','Rossi','valentino.rossi@example.com','11-4000-0031','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5)),
  ('Felipe','Paz','felipe.paz@example.com','11-4000-0032','pass123',(SELECT id_categoria FROM categoria WHERE valor_numerico = 5));

-- 3) Crear 16 equipos emparejando jugadores consecutivos (por id_jugador ordenado)
WITH players AS (
  SELECT id_jugador, ROW_NUMBER() OVER (ORDER BY id_jugador) AS rn
  FROM jugador
  WHERE categoria_id = (SELECT id_categoria FROM categoria WHERE valor_numerico = 5)
)
INSERT INTO equipo (jugador1_id, jugador2_id, nombre_equipo)
SELECT p1.id_jugador, p2.id_jugador, 'Equipo 5ta ' || ((p1.rn + 1)/2)
FROM players p1
JOIN players p2 ON p2.rn = p1.rn + 1
WHERE (p1.rn % 2) = 1
ORDER BY p1.rn;

-- 4) Inscribir esos equipos en el torneo creado (busca por nombre del torneo)
INSERT INTO inscripcion (id_equipo, id_torneo)
SELECT e.id_equipo, t.id_torneo
FROM equipo e
CROSS JOIN (SELECT id_torneo FROM torneo WHERE nombre_torneo = 'Torneo 5ta Categoria - Liga (Miércoles/Viernes)' LIMIT 1) t
WHERE e.nombre_equipo LIKE 'Equipo 5ta %';

COMMIT;
