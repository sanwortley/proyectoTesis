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

-- Insertar categorías
INSERT INTO categoria (nombre) VALUES
('2da'), ('3ra'), ('4ta'), ('5ta'), ('6ta'), ('7ma'), ('8va');

-- Insertar usuario organizador
INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password, rol)
VALUES ('Fernando', 'Frias', 'ffrias@mail.com', '12345678', '1234', 'organizador');

-- Insertar valor inicial
INSERT INTO control_torneo_id (ultimo_id) VALUES (0);
