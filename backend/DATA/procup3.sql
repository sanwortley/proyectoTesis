-- Eliminar todas las tablas si existen

DROP TABLE IF EXISTS 
  control_torneo_id, 
  partidos_llave, 
  partidos_grupo,
  equipos_grupo,
  grupos,
  partido, 
  inscripcion, 
  equipo, 
  audit_log_ingresos,
  ranking_jugador,        
  jugador, 
  torneo, 
  categoria 
CASCADE;

-- Tabla de categorías
CREATE TABLE categoria (
  id_categoria SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL
);

-- Tabla de torneos
CREATE TABLE torneo (
  id_torneo SERIAL PRIMARY KEY,
  nombre_torneo VARCHAR(100) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  fecha_cierre_inscripcion DATE NOT NULL,
  max_equipos INT NOT NULL,
  categoria INT REFERENCES categoria(id_categoria)
);

-- Tabla de jugadores (usuarios)
CREATE TABLE jugador (
  id_jugador SERIAL PRIMARY KEY,
  nombre_jugador VARCHAR(100) NOT NULL,
  apellido_jugador VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  telefono VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'jugador' CHECK (rol IN ('jugador', 'organizador')),
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de equipos
CREATE TABLE equipo (
  id_equipo SERIAL PRIMARY KEY,
  jugador1_id INT REFERENCES jugador(id_jugador),
  jugador2_id INT REFERENCES jugador(id_jugador),
  nombre_equipo VARCHAR(100) NOT NULL
);

-- Tabla de inscripciones
CREATE TABLE inscripcion (
  id_inscripcion SERIAL PRIMARY KEY,
  id_equipo INT REFERENCES equipo(id_equipo),
  id_torneo INT REFERENCES torneo(id_torneo)
);

-- Tabla de partidos (general)
CREATE TABLE partido (
  id_partido SERIAL PRIMARY KEY,
  id_torneo INT REFERENCES torneo(id_torneo),
  equipo1_id INT REFERENCES equipo(id_equipo),
  equipo2_id INT REFERENCES equipo(id_equipo),
  fecha DATE,
  resultado VARCHAR(50)
);

-- Tabla de grupos
CREATE TABLE grupos (
  id_grupo SERIAL PRIMARY KEY,
  id_torneo INT NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  FOREIGN KEY (id_torneo) REFERENCES torneo(id_torneo) ON DELETE CASCADE
);

-- Equipos en grupos
CREATE TABLE equipos_grupo (
  id SERIAL PRIMARY KEY,
  grupo_id INT NOT NULL,
  equipo_id INT NOT NULL,
  puntos INT DEFAULT 0,
  partidos_jugados INT DEFAULT 0,
  sets_favor INT DEFAULT 0,
  sets_contra INT DEFAULT 0,
  FOREIGN KEY (grupo_id) REFERENCES grupos(id_grupo) ON DELETE CASCADE,
  FOREIGN KEY (equipo_id) REFERENCES equipo(id_equipo) ON DELETE CASCADE
);

-- Partidos de fase de grupos
CREATE TABLE partidos_grupo (
  id SERIAL PRIMARY KEY,
  grupo_id INT NOT NULL,
  equipo1_id INT NOT NULL,
  equipo2_id INT NOT NULL,
  set1_equipo1 INT,
  set1_equipo2 INT,
  set2_equipo1 INT,
  set2_equipo2 INT,
  set3_equipo1 INT,
  set3_equipo2 INT,
  estado VARCHAR(20) DEFAULT 'no_iniciado',
  FOREIGN KEY (grupo_id) REFERENCES grupos(id_grupo) ON DELETE CASCADE,
  FOREIGN KEY (equipo1_id) REFERENCES equipo(id_equipo),
  FOREIGN KEY (equipo2_id) REFERENCES equipo(id_equipo)
);

-- Partidos de eliminación directa
CREATE TABLE partidos_llave (
    id              SERIAL PRIMARY KEY,

    -- Referencia al torneo
    id_torneo       INT NOT NULL
                    REFERENCES torneo(id_torneo)
                    ON DELETE CASCADE,

    -- Ronda del cuadro
    ronda           VARCHAR(20) NOT NULL
                    CHECK (ronda IN ('OCTAVOS', 'CUARTOS', 'SEMIS', 'FINAL')),

    -- Posición del partido dentro de la ronda
    orden           INT NOT NULL,

    -- Equipos participantes
    equipo1_id      INT REFERENCES equipo(id_equipo) ON DELETE SET NULL,
    equipo2_id      INT REFERENCES equipo(id_equipo) ON DELETE SET NULL,

    -- Resultados por set
    set1_equipo1    INT,
    set1_equipo2    INT,
    set2_equipo1    INT,
    set2_equipo2    INT,
    set3_equipo1    INT,
    set3_equipo2    INT,

    -- Estado del partido
    estado          VARCHAR(20) NOT NULL DEFAULT 'no_iniciado'
                    CHECK (estado IN ('no_iniciado', 'en_juego', 'finalizado')),

    -- Ganador del partido
    ganador_id      INT REFERENCES equipo(id_equipo) ON DELETE SET NULL,

    -- Enlace al partido siguiente en la llave
    next_match_id   INT REFERENCES partidos_llave(id) ON DELETE SET NULL,
    next_slot       SMALLINT CHECK (next_slot IN (1, 2)), -- 1 = equipo1, 2 = equipo2

    -- Timestamps
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),




    -- Reglas básicas
    CONSTRAINT ck_equipos_distintos CHECK (
        equipo1_id IS NULL OR equipo2_id IS NULL OR equipo1_id <> equipo2_id
    ),
    CONSTRAINT ck_sets_no_negativos CHECK (
        COALESCE(set1_equipo1,0) >= 0 AND COALESCE(set1_equipo2,0) >= 0 AND
        COALESCE(set2_equipo1,0) >= 0 AND COALESCE(set2_equipo2,0) >= 0 AND
        COALESCE(set3_equipo1,0) >= 0 AND COALESCE(set3_equipo2,0) >= 0
    )
);

-- Índices para búsqueda rápida
CREATE UNIQUE INDEX IF NOT EXISTS ux_llave_torneo_ronda_orden
    ON partidos_llave (id_torneo, ronda, orden);

CREATE INDEX IF NOT EXISTS ix_llave_torneo_ronda
    ON partidos_llave (id_torneo, ronda, orden);

  CREATE TABLE audit_log_ingresos (
  id BIGSERIAL PRIMARY KEY,
  jugador_id INT REFERENCES jugador(id_jugador) ON DELETE SET NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip INET,
  user_agent TEXT,
  exitoso BOOLEAN NOT NULL,
  motivo VARCHAR(100)
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_audit_jugador_timestamp ON audit_log_ingresos (jugador_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ip_timestamp      ON audit_log_ingresos (ip, "timestamp" DESC);
-- Tabla de control para el último ID generado
CREATE TABLE control_torneo_id (
  ultimo_id INT NOT NULL
);

-- Tabla de ranking de jugadores
CREATE TABLE ranking_jugador (
  id SERIAL PRIMARY KEY,

  -- referencia al jugador
  jugador_id INT REFERENCES jugador(id_jugador) ON DELETE CASCADE,

  -- nombre y apellido del jugador (se guardan para mantener histórico si cambia)
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,

  -- Ej: "García", "Pérez" → apellido de su última pareja
  ultima_pareja VARCHAR(100),

  -- Ej: "Torneo Apertura 2025 - 6ta"
  torneo_participado VARCHAR(150),

  -- Ej: "fase de grupos", "16avos", "octavos", "cuartos",
  --     "semifinal", "subcampeon", "campeon"
  fase_llegada VARCHAR(50),

  -- TOTAL acumulado del jugador en esa categoría
  puntos INT DEFAULT 0,

  -- para ranking por categoría (2da, 3ra, 4ta, 5ta, 6ta, 7ma, 8va…)
  categoria INT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice útil para ordenar por puntos
CREATE INDEX idx_ranking_puntos ON ranking_jugador (puntos DESC);

-- Insertar categorías
INSERT INTO categoria (nombre) VALUES
('2da'), ('3ra'), ('4ta'), ('5ta'), ('6ta'), ('7ma'), ('8va');



-- Insertar valor inicial
INSERT INTO control_torneo_id (ultimo_id) VALUES (0);

-- ============================
-- SEED: 40 jugadores + 20 equipos + 1 torneo + inscripciones
-- ============================

-- 1) Insertar 40 jugadores
-- 1) Crear 40 jugadores
INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password, rol)
VALUES
  ('Juan',       'Pérez',      'juan1@mail.com',      '11111111', '1234', 'jugador'),
  ('Lucas',      'García',     'lucas2@mail.com',     '11111112', '1234', 'jugador'),
  ('Diego',      'López',      'diego3@mail.com',     '11111113', '1234', 'jugador'),
  ('Matías',     'Fernández',  'matias4@mail.com',    '11111114', '1234', 'jugador'),
  ('Agustín',    'Ramírez',    'agustin5@mail.com',   '11111115', '1234', 'jugador'),
  ('Franco',     'Sosa',       'franco6@mail.com',    '11111116', '1234', 'jugador'),
  ('Nicolás',    'Martínez',   'nicolas7@mail.com',   '11111117', '1234', 'jugador'),
  ('Bruno',      'Rojas',      'bruno8@mail.com',     '11111118', '1234', 'jugador'),
  ('Ezequiel',   'Ortiz',      'ezequiel9@mail.com',  '11111119', '1234', 'jugador'),
  ('Tomás',      'Maldonado',  'tomas10@mail.com',    '11111120', '1234', 'jugador'),

  ('Julián',     'Silva',      'julian11@mail.com',   '11111121', '1234', 'jugador'),
  ('Alejo',      'Medina',     'alejo12@mail.com',    '11111122', '1234', 'jugador'),
  ('Benjamín',   'Suárez',     'benja13@mail.com',    '11111123', '1234', 'jugador'),
  ('Rodrigo',    'Vega',       'rodrigo14@mail.com',  '11111124', '1234', 'jugador'),
  ('Federico',   'Arias',      'fede15@mail.com',     '11111125', '1234', 'jugador'),
  ('Mauricio',   'Roldán',     'mauri16@mail.com',    '11111126', '1234', 'jugador'),
  ('Hernán',     'Castro',     'hernan17@mail.com',   '11111127', '1234', 'jugador'),
  ('Cristian',   'Benítez',    'cristian18@mail.com', '11111128', '1234', 'jugador'),
  ('Pablo',      'Lucero',     'pablo19@mail.com',    '11111129', '1234', 'jugador'),
  ('Gastón',     'Paz',        'gaston20@mail.com',   '11111130', '1234', 'jugador'),

  ('Álvaro',     'Peralta',    'alvaro21@mail.com',   '11111131', '1234', 'jugador'),
  ('Ramiro',     'Quiroga',    'ramiro22@mail.com',   '11111132', '1234', 'jugador'),
  ('Daniel',     'Moyano',     'daniel23@mail.com',   '11111133', '1234', 'jugador'),
  ('Sebastián',  'Giménez',    'seba24@mail.com',     '11111134', '1234', 'jugador'),
  ('Emiliano',   'Campos',     'emi25@mail.com',      '11111135', '1234', 'jugador'),
  ('Facundo',    'Villalba',   'facu26@mail.com',     '11111136', '1234', 'jugador'),
  ('Marcos',     'Guzmán',     'marcos27@mail.com',   '11111137', '1234', 'jugador'),
  ('Joel',       'Aguilar',    'joel28@mail.com',     '11111138', '1234', 'jugador'),
  ('Kevin',      'Córdoba',    'kevin29@mail.com',    '11111139', '1234', 'jugador'),
  ('Maximiliano','Ponce',      'maxi30@mail.com',     '11111140', '1234', 'jugador'),

  ('Ricardo',    'Montiel',    'ricardo31@mail.com',  '11111141', '1234', 'jugador'),
  ('Ulises',     'Amaya',      'ulises32@mail.com',   '11111142', '1234', 'jugador'),
  ('Santiago',   'Romero',     'santiago33@mail.com', '11111143', '1234', 'jugador'),
  ('Lionel',     'Suñiga',     'lionel34@mail.com',   '11111144', '1234', 'jugador'),
  ('Mauricio',   'Vivas',      'mauri35@mail.com',    '11111145', '1234', 'jugador'),
  ('Cristoffer', 'Navarro',    'cristoffer36@mail.com','11111146','1234','jugador'),
  ('Brayan',     'Gudiño',     'brayan37@mail.com',   '11111147', '1234', 'jugador'),
  ('Claudio',    'Tejeda',     'claudio38@mail.com',  '11111148', '1234', 'jugador'),
  ('Isaías',     'Casas',      'isaias39@mail.com',   '11111149', '1234', 'jugador'),
  ('Felipe',     'Gallo',      'felipe40@mail.com',   '11111150', '1234', 'jugador');

------------------------------------------------------------
-- 2) Crear SOLO 16 equipos para este torneo demo
--    (jugadores 1..32 emparejados de a dos)
------------------------------------------------------------
INSERT INTO equipo (jugador1_id, jugador2_id, nombre_equipo) VALUES
  (1,  2,  'Pérez/García'),
  (3,  4,  'López/Fernández'),
  (5,  6,  'Ramírez/Sosa'),
  (7,  8,  'Martínez/Rojas'),
  (9,  10, 'Ortiz/Maldonado'),
  (11, 12, 'Silva/Medina'),
  (13, 14, 'Suárez/Vega'),
  (15, 16, 'Arias/Roldán'),
  (17, 18, 'Castro/Benítez'),
  (19, 20, 'Lucero/Paz'),
  (21, 22, 'Peralta/Quiroga'),
  (23, 24, 'Moyano/Giménez'),
  (25, 26, 'Campos/Villalba'),
  (27, 28, 'Guzmán/Aguilar'),
  (29, 30, 'Córdoba/Ponce'),
  (31, 32, 'Montiel/Amaya');

-- Ojo: los jugadores 33..40 quedan libres para otros torneos
-- (Romero/Suñiga/Vivas/Navarro/Gudiño/Tejeda/Casas/Gallo).

------------------------------------------------------------
-- 3) Crear torneo de prueba con 16 equipos máximo
------------------------------------------------------------
INSERT INTO torneo (
  nombre_torneo,
  fecha_inicio,
  fecha_fin,
  fecha_cierre_inscripcion,
  max_equipos,
  categoria
) VALUES (
  'Torneo Demo Completo',
  CURRENT_DATE + INTERVAL '7 days',
  CURRENT_DATE + INTERVAL '14 days',
  CURRENT_DATE + INTERVAL '5 days',
  16,         -- 👈 ahora 16 equipos
  4           -- por ejemplo 5ta
);

------------------------------------------------------------
-- 4) Inscribir SOLO los 16 equipos en el torneo (id_torneo = 1)
------------------------------------------------------------
INSERT INTO inscripcion (id_equipo, id_torneo) VALUES
  (1, 1),
  (2, 1),
  (3, 1),
  (4, 1),
  (5, 1),
  (6, 1),
  (7, 1),
  (8, 1),
  (9, 1),
  (10, 1),
  (11, 1),
  (12, 1),
  (13, 1),
  (14, 1),
  (15, 1),
  (16, 1);
