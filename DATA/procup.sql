-- Conectar a la base de datos
\c procup


--CREATE DATABASE procup;

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
  id_categoria INT REFERENCES Categoria(id_categoria)
);

CREATE TABLE jugador (
  id_jugador SERIAL PRIMARY KEY,
  nombre VARCHAR(100),
  apellido VARCHAR(100),
  edad INT
);

CREATE TABLE equipo (
  id_equipo SERIAL PRIMARY KEY,
  jugador1_id INT REFERENCES Jugador(id_jugador),
  jugador2_id INT REFERENCES Jugador(id_jugador)
);

CREATE TABLE inscripcion (
  id_inscripcion SERIAL PRIMARY KEY,
  id_equipo INT REFERENCES Equipo(id_equipo),
  id_torneo INT REFERENCES Torneo(id_torneo)
);

CREATE TABLE partido (
  id_partido SERIAL PRIMARY KEY,
  id_torneo INT REFERENCES Torneo(id_torneo),
  equipo1_id INT REFERENCES Equipo(id_equipo),
  equipo2_id INT REFERENCES Equipo(id_equipo),
  fecha DATE,
  resultado VARCHAR(50)
);


-- Insertar 
INSERT INTO categoria (nombre) VALUES
('2da'),
('3ra'),
('4ta'),
('5ta'),
('6ta'),
('7ma'),
('8va');


INSERT INTO jugador (nombre, apellido, edad) VALUES
('Juan', 'Pérez', 25),
('Carlos', 'Gómez', 30),
('Pedro', 'Fernández', 27),
('Luis', 'Díaz', 29);

INSERT INTO equipo (jugador1_id, jugador2_id) VALUES (1, 2), (3, 4);

INSERT INTO torneo (nombre, fecha_inicio, fecha_fin, id_categoria)
VALUES ('Pro Cup Apertura', '2025-06-01', '2025-06-15', 1);

INSERT INTO inscripcion (id_equipo, id_torneo) VALUES (1, 1), (2, 1);

INSERT INTO Partido (id_torneo, equipo1_id, equipo2_id, fecha, resultado) VALUES
(1, 1, 2, '2025-06-03', '6-4 3-6 10-8');