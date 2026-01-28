-- realistic_seed.sql
-- Borrar datos existentes
TRUNCATE TABLE partidos_llave, partidos_grupo, equipos_grupo, grupos, inscripcion, equipo, torneo, jugador, categoria RESTART IDENTITY CASCADE;

-- 1. Categorías
INSERT INTO categoria (nombre, valor_numerico) VALUES
('Suma 9', 9),
('6ta', 6),
('8va', 8);

-- 2. Torneos (Año 2024 para que aparezcan recientes)
INSERT INTO torneo (nombre_torneo, fecha_inicio, fecha_fin, fecha_cierre_inscripcion, max_equipos, categoria_id, formato_categoria, suma_categoria) VALUES
('Torneo Apertura Suma 9', '2024-03-10', '2024-03-20', '2024-03-08', 32, NULL, 'suma', 9),
('Torneo Clausura 6ta', '2024-04-01', '2024-04-10', '2024-03-30', 24, (SELECT id_categoria FROM categoria WHERE nombre='6ta'), 'categoria_fija', NULL),
('Torneo Verano 8va', '2024-01-15', '2024-01-25', '2024-01-12', 16, (SELECT id_categoria FROM categoria WHERE nombre='8va'), 'categoria_fija', NULL);

-- 3. Jugadores (Con Apodos Reales)
INSERT INTO jugador (nombre_jugador, apellido_jugador, apodo, email, password, categoria_id, rol) VALUES
('Gabriel', 'Battaglia', 'Loco', 'gaby@test.com', '$2b$10$X7...', 1, 'organizador'),
('Juan', 'Perez', 'Turco', 'juanp@test.com', '$2b$10$X7...', 2, 'jugador'),
('Carlos', 'Gomez', 'Charly', 'charly@test.com', '$2b$10$X7...', 2, 'jugador'),
('Miguel', 'Rodriguez', 'Zurdo', 'miguel@test.com', '$2b$10$X7...', 3, 'jugador'),
('Fernando', 'Lopez', 'Fer', 'fer@test.com', '$2b$10$X7...', 3, 'jugador'),
('Sebastian', 'Diaz', 'Seba', 'seba@test.com', '$2b$10$X7...', 2, 'jugador'),
('Alejandro', 'Martinez', 'Ale', 'ale@test.com', '$2b$10$X7...', 2, 'jugador'),
('Lucas', 'Garcia', 'Luquita', 'lucas@test.com', '$2b$10$X7...', 3, 'jugador'),
('Martin', 'Fernandez', 'Tincho', 'martin@test.com', '$2b$10$X7...', 3, 'jugador'),
('Pablo', 'Gonzalez', 'Pablito', 'pablo@test.com', '$2b$10$X7...', 2, 'jugador'),
('Nicolas', 'Sanchez', 'Nico', 'nico@test.com', '$2b$10$X7...', 2, 'jugador'),
('Diego', 'Romero', 'Dieguito', 'diego@test.com', '$2b$10$X7...', 2, 'jugador'),
('Matias', 'Sosa', 'Mati', 'mati@test.com', '$2b$10$X7...', 3, 'jugador'),
('Javier', 'Torres', 'Javi', 'javi@test.com', '$2b$10$X7...', 3, 'jugador'),
('Gustavo', 'Ruiz', 'Gus', 'gus@test.com', '$2b$10$X7...', 2, 'jugador'),
('Roberto', 'Alvarez', 'Tito', 'tito@test.com', '$2b$10$X7...', 2, 'jugador'),
('Mariano', 'Benitez', 'Marian', 'marian@test.com', '$2b$10$X7...', 3, 'jugador'),
('Federico', 'Acosta', 'Fede', 'fede@test.com', '$2b$10$X7...', 3, 'jugador'),
('Santiago', 'Cabrera', 'Santi', 'santi@test.com', '$2b$10$X7...', 2, 'jugador'),
('Daniel', 'Rios', 'Dani', 'dani@test.com', '$2b$10$X7...', 2, 'jugador');

-- 4. Equipos (Parejas)
INSERT INTO equipo (jugador1_id, jugador2_id, nombre_equipo) VALUES
((SELECT id_jugador FROM jugador WHERE email='juanp@test.com'), (SELECT id_jugador FROM jugador WHERE email='charly@test.com'), 'Los Maestros'),
((SELECT id_jugador FROM jugador WHERE email='miguel@test.com'), (SELECT id_jugador FROM jugador WHERE email='fer@test.com'), 'Zurdo y Fer'),
((SELECT id_jugador FROM jugador WHERE email='seba@test.com'), (SELECT id_jugador FROM jugador WHERE email='ale@test.com'), 'Dinamita'),
((SELECT id_jugador FROM jugador WHERE email='lucas@test.com'), (SELECT id_jugador FROM jugador WHERE email='martin@test.com'), 'Pibes de Oro'),
((SELECT id_jugador FROM jugador WHERE email='pablo@test.com'), (SELECT id_jugador FROM jugador WHERE email='nico@test.com'), 'Los Primos'),
((SELECT id_jugador FROM jugador WHERE email='diego@test.com'), (SELECT id_jugador FROM jugador WHERE email='mati@test.com'), 'Sin Frenos'),
((SELECT id_jugador FROM jugador WHERE email='javi@test.com'), (SELECT id_jugador FROM jugador WHERE email='gus@test.com'), 'La Dupla'),
((SELECT id_jugador FROM jugador WHERE email='tito@test.com'), (SELECT id_jugador FROM jugador WHERE email='marian@test.com'), 'Veteranos'),
((SELECT id_jugador FROM jugador WHERE email='fede@test.com'), (SELECT id_jugador FROM jugador WHERE email='santi@test.com'), 'Fede y Santi'),
((SELECT id_jugador FROM jugador WHERE email='dani@test.com'), (SELECT id_jugador FROM jugador WHERE email='gaby@test.com'), 'Dani y Gaby');

-- 5. Inscripciones (Torneo Suma 9) - Inscribimos 10 equipos
INSERT INTO inscripcion (id_torneo, id_equipo, estado_pago)
SELECT (SELECT id_torneo FROM torneo WHERE nombre_torneo='Torneo Apertura Suma 9'), id_equipo, 'pendiente'
FROM equipo;
