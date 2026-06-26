-- ============================================================
-- RESEED REAL — Pro Cup Padel
-- 2 torneos: Liga 5ta / Fin de semana 6ta
-- Jugadores con nombres argentinos reales
-- ============================================================

TRUNCATE TABLE
  partidos_llave, partidos_grupo, equipos_grupo, grupos,
  inscripcion, equipo, ranking_jugador, torneo, jugador, categoria
RESTART IDENTITY CASCADE;

-- ============================================================
-- CATEGORÍAS
-- ============================================================
INSERT INTO categoria (nombre, valor_numerico) VALUES
  ('2da Categoría', 2),
  ('3ra Categoría', 3),
  ('4ta Categoría', 4),
  ('5ta Categoría', 5),
  ('6ta Categoría', 6),
  ('7ma Categoría', 7),
  ('8va Categoría', 8);

-- ============================================================
-- ORGANIZADOR
-- ============================================================
INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password, rol, fecha_registro)
VALUES ('Santiago', 'Wortley', 'sanwortley@gmail.com', '1150001000', '1234', 'organizador', NOW());

-- ============================================================
-- JUGADORES — 5ta Categoría (20 jugadores para Liga)
-- ============================================================
INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password, rol, fecha_registro, categoria_id)
VALUES
  ('Lucas',      'Romero',     'lucas.romero@mail.com',    '1151001001', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Matías',     'Torres',     'matias.torres@mail.com',   '1151001002', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Agustín',    'García',     'agustin.garcia@mail.com',  '1151001003', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Facundo',    'López',      'facundo.lopez@mail.com',   '1151001004', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Rodrigo',    'Martínez',   'rodrigo.mtz@mail.com',     '1151001005', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Nicolás',    'Pérez',      'nicolas.perez@mail.com',   '1151001006', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Sebastián',  'González',   'sebas.gonza@mail.com',     '1151001007', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Federico',   'Sánchez',    'fede.sanchez@mail.com',    '1151001008', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Pablo',      'Rodríguez',  'pablo.rodri@mail.com',     '1151001009', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Diego',      'Fernández',  'diego.fernan@mail.com',    '1151001010', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Marcos',     'Silva',      'marcos.silva@mail.com',    '1151001011', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Tomás',      'Díaz',       'tomas.diaz@mail.com',      '1151001012', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Ezequiel',   'Moreno',     'eze.moreno@mail.com',      '1151001013', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Leandro',    'Suárez',     'lean.suarez@mail.com',     '1151001014', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Brian',      'Ruiz',       'brian.ruiz@mail.com',      '1151001015', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Iván',       'Castro',     'ivan.castro@mail.com',     '1151001016', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Maximiliano','Acuña',      'maxi.acuna@mail.com',      '1151001017', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Cristian',   'Blanco',     'cris.blanco@mail.com',     '1151001018', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Andrés',     'Molina',     'andres.molina@mail.com',   '1151001019', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5)),
  ('Ramiro',     'Vargas',     'ramiro.vargas@mail.com',   '1151001020', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=5));

-- ============================================================
-- JUGADORES — 6ta Categoría (20 jugadores para Fin de semana)
-- ============================================================
INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password, rol, fecha_registro, categoria_id)
VALUES
  ('Esteban',    'Cruz',       'esteban.cruz@mail.com',    '1152001001', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Hernán',     'Flores',     'hernan.flores@mail.com',   '1152001002', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Gustavo',    'Medina',     'gustavo.medina@mail.com',  '1152001003', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Roberto',    'Lima',       'roberto.lima@mail.com',    '1152001004', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Claudio',    'Vera',       'claudio.vera@mail.com',    '1152001005', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Hugo',       'Montoya',    'hugo.montoya@mail.com',    '1152001006', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Walter',     'Cabrera',    'walter.cabrera@mail.com',  '1152001007', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Jorge',      'Reyes',      'jorge.reyes@mail.com',     '1152001008', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Eduardo',    'Espinoza',   'edu.espinoza@mail.com',    '1152001009', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Sergio',     'Mora',       'sergio.mora@mail.com',     '1152001010', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Carlos',     'Valdez',     'carlos.valdez@mail.com',   '1152001011', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Damián',     'Herrera',    'damian.herrera@mail.com',  '1152001012', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Javier',     'Peralta',    'javier.peralta@mail.com',  '1152001013', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Marcelo',    'Ríos',       'marcelo.rios@mail.com',    '1152001014', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Néstor',     'Ponce',      'nestor.ponce@mail.com',    '1152001015', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Ariel',      'Giménez',    'ariel.gimenez@mail.com',   '1152001016', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Oscar',      'Benítez',    'oscar.benitez@mail.com',   '1152001017', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Rubén',      'Aguirre',    'ruben.aguirre@mail.com',   '1152001018', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Martín',     'Ibáñez',     'martin.ibanez@mail.com',   '1152001019', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6)),
  ('Emilio',     'Paredes',    'emilio.paredes@mail.com',  '1152001020', '1234', 'jugador', NOW(), (SELECT id_categoria FROM categoria WHERE valor_numerico=6));

-- ============================================================
-- TORNEOS
-- ============================================================
INSERT INTO torneo (nombre_torneo, formato_categoria, categoria_id, suma_categoria, fecha_inicio, fecha_fin, fecha_cierre_inscripcion, max_equipos, modalidad, dias_juego)
VALUES
  (
    'Liga de 5ta 2026',
    'categoria_fija',
    (SELECT id_categoria FROM categoria WHERE valor_numerico = 5),
    NULL,
    '2026-07-21',
    '2026-10-30',
    '2026-07-18',
    10,
    'liga',
    'Martes,Jueves'
  ),
  (
    'Copa de 6ta — Julio 2026',
    'categoria_fija',
    (SELECT id_categoria FROM categoria WHERE valor_numerico = 6),
    NULL,
    '2026-07-12',
    '2026-07-20',
    '2026-07-10',
    8,
    'fin_de_semana',
    'Sábado,Domingo'
  );

-- ============================================================
-- EQUIPOS — Liga 5ta (6 equipos inscriptos, 4 cupos libres)
-- ============================================================
INSERT INTO equipo (jugador1_id, jugador2_id, nombre_equipo) VALUES
  ((SELECT id_jugador FROM jugador WHERE email='lucas.romero@mail.com'),   (SELECT id_jugador FROM jugador WHERE email='matias.torres@mail.com'),   'Romero / Torres'),
  ((SELECT id_jugador FROM jugador WHERE email='agustin.garcia@mail.com'), (SELECT id_jugador FROM jugador WHERE email='facundo.lopez@mail.com'),   'García / López'),
  ((SELECT id_jugador FROM jugador WHERE email='rodrigo.mtz@mail.com'),    (SELECT id_jugador FROM jugador WHERE email='nicolas.perez@mail.com'),   'Martínez / Pérez'),
  ((SELECT id_jugador FROM jugador WHERE email='sebas.gonza@mail.com'),    (SELECT id_jugador FROM jugador WHERE email='fede.sanchez@mail.com'),    'González / Sánchez'),
  ((SELECT id_jugador FROM jugador WHERE email='pablo.rodri@mail.com'),    (SELECT id_jugador FROM jugador WHERE email='diego.fernan@mail.com'),    'Rodríguez / Fernández'),
  ((SELECT id_jugador FROM jugador WHERE email='marcos.silva@mail.com'),   (SELECT id_jugador FROM jugador WHERE email='tomas.diaz@mail.com'),      'Silva / Díaz');

-- EQUIPOS — Copa 6ta (5 equipos inscriptos, 3 cupos libres)
INSERT INTO equipo (jugador1_id, jugador2_id, nombre_equipo) VALUES
  ((SELECT id_jugador FROM jugador WHERE email='esteban.cruz@mail.com'),   (SELECT id_jugador FROM jugador WHERE email='hernan.flores@mail.com'),   'Cruz / Flores'),
  ((SELECT id_jugador FROM jugador WHERE email='gustavo.medina@mail.com'), (SELECT id_jugador FROM jugador WHERE email='roberto.lima@mail.com'),    'Medina / Lima'),
  ((SELECT id_jugador FROM jugador WHERE email='claudio.vera@mail.com'),   (SELECT id_jugador FROM jugador WHERE email='hugo.montoya@mail.com'),    'Vera / Montoya'),
  ((SELECT id_jugador FROM jugador WHERE email='walter.cabrera@mail.com'), (SELECT id_jugador FROM jugador WHERE email='jorge.reyes@mail.com'),     'Cabrera / Reyes'),
  ((SELECT id_jugador FROM jugador WHERE email='edu.espinoza@mail.com'),   (SELECT id_jugador FROM jugador WHERE email='sergio.mora@mail.com'),     'Espinoza / Mora');

-- ============================================================
-- INSCRIPCIONES
-- ============================================================
INSERT INTO inscripcion (id_torneo, id_equipo)
SELECT
  (SELECT id_torneo FROM torneo WHERE nombre_torneo = 'Liga de 5ta 2026'),
  id_equipo
FROM equipo
WHERE nombre_equipo IN (
  'Romero / Torres', 'García / López', 'Martínez / Pérez',
  'González / Sánchez', 'Rodríguez / Fernández', 'Silva / Díaz'
);

INSERT INTO inscripcion (id_torneo, id_equipo)
SELECT
  (SELECT id_torneo FROM torneo WHERE nombre_torneo = 'Copa de 6ta — Julio 2026'),
  id_equipo
FROM equipo
WHERE nombre_equipo IN (
  'Cruz / Flores', 'Medina / Lima', 'Vera / Montoya',
  'Cabrera / Reyes', 'Espinoza / Mora'
);
