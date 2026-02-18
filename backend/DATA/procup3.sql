-- ============================
-- DROP de todo para arrancar limpio
-- ============================

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

-- ============================
-- Tabla de categorías (2da a 8va)
-- ============================

CREATE TABLE categoria (
  id_categoria    SERIAL PRIMARY KEY,
  nombre          VARCHAR(50) NOT NULL,
  valor_numerico  INT NOT NULL CHECK (valor_numerico BETWEEN 2 AND 8)
);

-- ============================
-- Tabla de torneos
-- ============================

CREATE TABLE torneo (
  id_torneo                SERIAL PRIMARY KEY,
  nombre_torneo            VARCHAR(100) NOT NULL,
  fecha_inicio             DATE NOT NULL,
  fecha_fin                DATE NOT NULL,
  fecha_cierre_inscripcion DATE NOT NULL,
  max_equipos              INT NOT NULL,

  categoria_id             INT REFERENCES categoria(id_categoria),

  formato_categoria        VARCHAR(20) NOT NULL
      CHECK (formato_categoria IN ('categoria_fija', 'suma')),

  suma_categoria           INT,

  CONSTRAINT ck_formato_categoria_valida CHECK (
      (formato_categoria = 'categoria_fija' AND categoria_id IS NOT NULL AND suma_categoria IS NULL)
   OR (formato_categoria = 'suma'           AND suma_categoria IS NOT NULL AND categoria_id IS NULL)
  )
);

-- ============================
-- Tabla de jugadores
-- ============================

CREATE TABLE jugador (
  id_jugador       SERIAL PRIMARY KEY,
  nombre_jugador   VARCHAR(100) NOT NULL,
  apellido_jugador VARCHAR(100) NOT NULL,
  apodo            VARCHAR(50), -- Nuevo campo opcional
  email            VARCHAR(100) UNIQUE NOT NULL,
  telefono         VARCHAR(20),
  password         VARCHAR(255) NOT NULL,
  rol              VARCHAR(20) NOT NULL DEFAULT 'jugador'
                    CHECK (rol IN ('jugador', 'organizador')),
  fecha_registro   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  categoria_id     INT REFERENCES categoria(id_categoria)
);

-- ============================
-- Tabla de equipos
-- ============================

CREATE TABLE equipo (
  id_equipo      SERIAL PRIMARY KEY,
  jugador1_id    INT REFERENCES jugador(id_jugador),
  jugador2_id    INT REFERENCES jugador(id_jugador),
  nombre_equipo  VARCHAR(100) NOT NULL
);

-- ============================
-- Tabla de inscripciones
-- ============================

CREATE TABLE inscripcion (
  id_inscripcion SERIAL PRIMARY KEY,
  id_equipo      INT REFERENCES equipo(id_equipo) ON DELETE CASCADE,
  id_torneo      INT REFERENCES torneo(id_torneo) ON DELETE CASCADE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================
-- TABLAS DE FASE DE GRUPOS
-- ============================

-- Grupos de un torneo (A, B, C, ...)
CREATE TABLE grupos (
  id_grupo   SERIAL PRIMARY KEY,
  id_torneo  INT NOT NULL REFERENCES torneo(id_torneo) ON DELETE CASCADE,
  nombre     VARCHAR(50) NOT NULL
);

-- Equipos dentro de cada grupo, con estadísticas
CREATE TABLE equipos_grupo (
  id               SERIAL PRIMARY KEY,
  grupo_id         INT NOT NULL REFERENCES grupos(id_grupo) ON DELETE CASCADE,
  equipo_id        INT NOT NULL REFERENCES equipo(id_equipo) ON DELETE CASCADE,
  puntos           INT DEFAULT 0,
  partidos_jugados INT DEFAULT 0,
  sets_favor       INT DEFAULT 0,
  sets_contra      INT DEFAULT 0
);

-- Partidos de fase de grupos (round-robin)
CREATE TABLE partidos_grupo (
  id              SERIAL PRIMARY KEY,
  grupo_id        INT NOT NULL REFERENCES grupos(id_grupo) ON DELETE CASCADE,
  equipo1_id      INT NOT NULL REFERENCES equipo(id_equipo),
  equipo2_id      INT NOT NULL REFERENCES equipo(id_equipo),

  set1_equipo1    INT,
  set1_equipo2    INT,
  set2_equipo1    INT,
  set2_equipo2    INT,
  set3_equipo1    INT,
  set3_equipo2    INT,

  estado          VARCHAR(20) DEFAULT 'no_iniciado'
                    CHECK (estado IN ('no_iniciado','iniciado','finalizado'))
);

-- ============================
-- TABLA DE PLAY-OFF (LLAVES)
-- ============================

CREATE TABLE partidos_llave (
  id              SERIAL PRIMARY KEY,
  id_torneo       INT NOT NULL REFERENCES torneo(id_torneo) ON DELETE CASCADE,

  ronda           VARCHAR(20) NOT NULL,        -- OCTAVOS, CUARTOS, SEMIS, FINAL
  orden           INT NOT NULL,                -- para ordenar visualmente los cruces

  equipo1_id      INT REFERENCES equipo(id_equipo),
  equipo2_id      INT REFERENCES equipo(id_equipo),

  set1_equipo1    INT,
  set1_equipo2    INT,
  set2_equipo1    INT,
  set2_equipo2    INT,
  set3_equipo1    INT,
  set3_equipo2    INT,

  estado          VARCHAR(20) DEFAULT 'no_iniciado'
                    CHECK (estado IN ('no_iniciado','iniciado','finalizado')),
  ganador_id      INT REFERENCES equipo(id_equipo),

  next_match_id   INT,                          -- partido donde avanza el ganador
  next_slot       INT,                          -- 1 ó 2 (posición en el siguiente partido)

  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ============================
-- TABLA DE RANKING (para /ranking)
-- ============================

CREATE TABLE ranking_jugador (
  id                 SERIAL PRIMARY KEY,
  jugador_id         INT NOT NULL REFERENCES jugador(id_jugador) ON DELETE CASCADE,
  nombre             VARCHAR(100) NOT NULL,
  apellido           VARCHAR(100) NOT NULL,
  ultima_pareja      VARCHAR(150),
  torneo_participado VARCHAR(150),
  fase_llegada       VARCHAR(50),
  puntos             INT NOT NULL DEFAULT 0,
  categoria          VARCHAR(50) NOT NULL
);

-- ============================
-- TABLA DE AUDITORÍA (opcional pero usada por rutas)
-- ============================

CREATE TABLE audit_log_ingresos (
  id           SERIAL PRIMARY KEY,
  jugador_id   INT,
  nombre       VARCHAR(100),
  apellido     VARCHAR(100),
  ip           VARCHAR(50),
  user_agent   TEXT,
  exitoso      BOOLEAN DEFAULT FALSE,
  motivo       TEXT,
  timestamp    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================
-- ---------------- SEED DATA LARGE ----------------
-- ============================

-- Categorías
INSERT INTO categoria (nombre, valor_numerico) VALUES
('2da',2), ('3ra',3), ('4ta',4), ('5ta',5), ('6ta',6), ('7ma',7), ('8va',8);

-- =========================================================================
-- TORNEO 1: CATEGORÍA 6TA (Valor 6) - 16 EQUIPOS (32 Jugadores)
-- =========================================================================

-- Crear 32 Jugadores de 6ta (id_categoria=5 es 6ta en el orden de insert arriba, asumimos IDs autoincrementales 1..7)
-- CUIDADO: Los IDs dependen del orden. 
-- '2da'->1, '3ra'->2, '4ta'->3, '5ta'->4, '6ta'->5, '7ma'->6, '8va'->7

INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password, categoria_id)
SELECT 
  'Jugador6ta_' || i, 
  'Apellido' || i, 
  'jugador6ta_' || i || '@mail.com', 
  '111111', 
  '1234', 
  5 -- 6ta
FROM generate_series(1, 32) AS i;

-- Crear Torneo 1
INSERT INTO torneo (
  nombre_torneo, fecha_inicio, fecha_fin, fecha_cierre_inscripcion, max_equipos,
  categoria_id, formato_categoria, suma_categoria
) VALUES (
  'Torneo 6ta Categoria',
  CURRENT_DATE + 5, CURRENT_DATE + 20, CURRENT_DATE + 2, 16,
  5, 'categoria_fija', NULL
);

-- Crear 16 Equipos (usando los jugadores recién creados, IDs probables 1..32)
-- Uniremos 1 con 2, 3 con 4, etc.
DO $$
DECLARE
    j_id INT;
    t_id INT;
BEGIN
    SELECT id_torneo INTO t_id FROM torneo WHERE nombre_torneo = 'Torneo 6ta Categoria';
    FOR j_id IN 1..31 BY 2 LOOP -- 1, 3, 5... hasta 31
        INSERT INTO equipo (jugador1_id, jugador2_id, nombre_equipo)
        VALUES (
            (SELECT id_jugador FROM jugador WHERE email = 'jugador6ta_' || j_id || '@mail.com'),
            (SELECT id_jugador FROM jugador WHERE email = 'jugador6ta_' || (j_id+1) || '@mail.com'),
            'Equipo 6ta ' || ((j_id+1)/2)
        );
        INSERT INTO inscripcion (id_equipo, id_torneo)
        VALUES (currval('equipo_id_equipo_seq'), t_id);
    END LOOP;
END $$;


-- =========================================================================
-- TORNEO 2: SUMA 9 (10 EQUIPOS) - 20 JUGADORES
-- Parejas posibles: 5ta(5)+4ta(4)=9. Haremos 10 de estas parejas.
-- =========================================================================

-- 10 Jugadores 5ta (Cat ID 4)
INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password, categoria_id)
SELECT 'Jugador5ta_' || i, 'Apellido' || i, 'jugador5ta_' || i || '@mail.com', '1111', '1234', 4 
FROM generate_series(1, 10) AS i;

-- 10 Jugadores 4ta (Cat ID 3)
INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password, categoria_id)
SELECT 'Jugador4ta_' || i, 'Apellido' || i, 'jugador4ta_' || i || '@mail.com', '1111', '1234', 3
FROM generate_series(1, 10) AS i;

-- Crear Torneo 2
INSERT INTO torneo (
  nombre_torneo, fecha_inicio, fecha_fin, fecha_cierre_inscripcion, max_equipos,
  categoria_id, formato_categoria, suma_categoria
) VALUES (
  'Torneo SUMA 9',
  CURRENT_DATE + 7, CURRENT_DATE + 25, CURRENT_DATE + 3, 16,
  NULL, 'suma', 9
);

-- Crear 10 Equipos (1 de 5ta + 1 de 4ta)
DO $$
DECLARE
    i INT;
    t_id INT;
BEGIN
    SELECT id_torneo INTO t_id FROM torneo WHERE nombre_torneo = 'Torneo SUMA 9';
    FOR i IN 1..10 LOOP
        INSERT INTO equipo (jugador1_id, jugador2_id, nombre_equipo)
        VALUES (
            (SELECT id_jugador FROM jugador WHERE email = 'jugador5ta_' || i || '@mail.com'),
            (SELECT id_jugador FROM jugador WHERE email = 'jugador4ta_' || i || '@mail.com'),
            'Equipo Suma9 ' || i
        );
        INSERT INTO inscripcion (id_equipo, id_torneo)
        VALUES (currval('equipo_id_equipo_seq'), t_id);
    END LOOP;
END $$;


-- =========================================================================
-- TORNEO 3: CATEGORÍA 8VA (Valor 8) - 8 EQUIPOS (16 Jugadores)
-- =========================================================================

-- 16 Jugadores 8va (Cat ID 7)
INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password, categoria_id)
SELECT 'Jugador8va_' || i, 'Apellido' || i, 'jugador8va_' || i || '@mail.com', '1111', '1234', 7
FROM generate_series(1, 16) AS i;

-- Crear Torneo 3
INSERT INTO torneo (
  nombre_torneo, fecha_inicio, fecha_fin, fecha_cierre_inscripcion, max_equipos,
  categoria_id, formato_categoria, suma_categoria
) VALUES (
  'Torneo 8va Categoria',
  CURRENT_DATE + 2, CURRENT_DATE + 10, CURRENT_DATE + 1, 16,
  7, 'categoria_fija', NULL
);

-- Crear 8 Equipos
DO $$
DECLARE
    j_id INT;
    t_id INT;
BEGIN
    SELECT id_torneo INTO t_id FROM torneo WHERE nombre_torneo = 'Torneo 8va Categoria';
    FOR j_id IN 1..15 BY 2 LOOP
        INSERT INTO equipo (jugador1_id, jugador2_id, nombre_equipo)
        VALUES (
            (SELECT id_jugador FROM jugador WHERE email = 'jugador8va_' || j_id || '@mail.com'),
            (SELECT id_jugador FROM jugador WHERE email = 'jugador8va_' || (j_id+1) || '@mail.com'),
            'Equipo 8va ' || ((j_id+1)/2)
        );
        INSERT INTO inscripcion (id_equipo, id_torneo)
        VALUES (currval('equipo_id_equipo_seq'), t_id);
    END LOOP;
END $$;

