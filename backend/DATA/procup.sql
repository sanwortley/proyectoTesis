-- Crear la tabla 
CREATE TABLE categoria (
  id_categoria SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL
);

CREATE TABLE torneo (
  id_torneo SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  cierre_inscripcion DATE NOT NULL,
  cantidad_maxima_equipos INT NOT NULL,
  id_categoria INT REFERENCES categoria(id_categoria)
);
CREATE TABLE usuario (
  id_usuario SERIAL PRIMARY KEY,
  nombre_completo VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  telefono VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'jugador' CHECK (rol IN ('jugador', 'organizador')),
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jugador (
  id_jugador SERIAL PRIMARY KEY,
  nombre VARCHAR(100),
  apellido VARCHAR(100),
  edad INT
);

CREATE TABLE equipo (
  id_equipo SERIAL PRIMARY KEY,
  jugador1_id INT REFERENCES jugador(id_jugador),
  jugador2_id INT REFERENCES jugador(id_jugador)
);

CREATE TABLE inscripcion (
  id_inscripcion SERIAL PRIMARY KEY,
  id_equipo INT REFERENCES equipo(id_equipo),
  id_torneo INT REFERENCES torneo(id_torneo)
);

CREATE TABLE partido (
  id_partido SERIAL PRIMARY KEY,
  id_torneo INT REFERENCES torneo(id_torneo),
  equipo1_id INT REFERENCES equipo(id_equipo),
  equipo2_id INT REFERENCES equipo(id_equipo),
  fecha DATE,
  resultado VARCHAR(50)
);

-- Insertar categorías
INSERT INTO categoria (nombre) VALUES
('2da'),
('3ra'),
('4ta'),
('5ta'),
('6ta'),
('7ma'),
('8va');

-- Insertar jugadores
INSERT INTO jugador (nombre, apellido, edad) VALUES
('Juan', 'Pérez', 25),
('Carlos', 'Gómez', 30),
('Pedro', 'Fernández', 27),
('Luis', 'Díaz', 29);

--Insertar usuarios
INSERT INTO usuario (nombre_completo, email, telefono, password)
VALUES ('Juan Pérez', 'juan.perez@example.com', '3512345678', 'claveEncriptada123');

INSERT INTO usuario (nombre_completo, email, telefono, password, rol)
VALUES ('Ana Martínez', 'ana.martinez@example.com', '3519876543', 'claveEncriptada456', 'organizador');


-- Insertar equipos
INSERT INTO equipo (jugador1_id, jugador2_id) VALUES (1, 2), (3, 4);

-- Insertar torneo
INSERT INTO torneo (nombre, fecha_inicio, fecha_fin, cierre_inscripcion, cantidad_maxima_equipos, id_categoria)
VALUES ('Pro Cup Apertura', '2025-06-01', '2025-06-15', '2025-05-30', 16, 1);



-- Inscripción de equipos
INSERT INTO inscripcion (id_equipo, id_torneo) VALUES (1, 1), (2, 1);

-- Insertar partido
INSERT INTO partido (id_torneo, equipo1_id, equipo2_id, fecha, resultado) VALUES
(1, 1, 2, '2025-06-03', '6-4 3-6 10-8');
