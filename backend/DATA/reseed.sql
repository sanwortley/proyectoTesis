-- Limpiar tablas
TRUNCATE TABLE partidos_llave, partidos_grupo, equipos_grupo, grupos, inscripcion, torneo, ranking_jugador, jugador, categoria RESTART IDENTITY CASCADE;

ALTER TABLE jugador ADD COLUMN IF NOT EXISTS foto_perfil TEXT;

-- Insertar Categorías
INSERT INTO categoria (nombre, valor_numerico) VALUES
('2da Categoría', 2),
('3ra Categoría', 3),
('4ta Categoría', 4),
('5ta Categoría', 5),
('6ta Categoría', 6),
('7ma Categoría', 7),
('8va Categoría', 8);

-- Insertar Jugadores (usando fecha_registro)
INSERT INTO jugador (nombre_jugador, apellido_jugador, apodo, email, telefono, password, rol, fecha_registro, foto_perfil) VALUES
('Gabriel', 'Batistuta', 'Batigol', 'gabriel@test.com', '11111111', '1234', 'organizador', NOW(), NULL),
('Martin', 'Palermo', 'Titan', 'martin@test.com', '22222222', '1234', 'jugador', NOW(), NULL),
('Lionel', 'Messi', 'La Pulga', 'leo@test.com', '33333333', '1234', 'jugador', NOW(), NULL),
('Diego', 'Maradona', 'Pelusa', 'diego@test.com', '44444444', '1234', 'jugador', NOW(), NULL),
('Juan', 'Riquelme', 'Topo Gigio', 'juan@test.com', '55555555', '1234', 'jugador', NOW(), NULL),
('Julian', 'Alvarez', 'La Araña', 'julian@test.com', '66666666', '1234', 'jugador', NOW(), NULL),
('Enzo', 'Fernandez', 'Gardelito', 'enzo@test.com', '77777777', '1234', 'jugador', NOW(), NULL),
('Angel', 'Di Maria', 'Fideo', 'angel@test.com', '88888888', '1234', 'jugador', NOW(), NULL),
('Emiliano', 'Martinez', 'Dibu', 'dibu@test.com', '99999999', '1234', 'jugador', NOW(), NULL),
('Sergio', 'Aguero', 'Kun', 'kun@test.com', '10101010', '1234', 'jugador', NOW(), NULL);

-- Insertar Torneos
INSERT INTO torneo (nombre_torneo, categoria_id, fecha_inicio, fecha_fin, fecha_cierre_inscripcion, max_equipos, formato_categoria) VALUES
('Torneo Verano 2026', (SELECT id_categoria FROM categoria WHERE valor_numerico = 2), '2026-01-15', '2026-02-15', '2026-01-10', 8, 'categoria_fija'),
('Torneo Apertura 2025', (SELECT id_categoria FROM categoria WHERE valor_numerico = 4), '2025-03-01', '2025-03-30', '2025-02-20', 8, 'categoria_fija'),
('Torneo Principiantes 2026', (SELECT id_categoria FROM categoria WHERE valor_numerico = 8), '2026-02-01', '2026-03-01', '2026-01-25', 8, 'categoria_fija');

-- Crear Equipos (CON NOMBRES ACTUALIZADOS: ApodoApellido)
INSERT INTO equipo (jugador1_id, jugador2_id, nombre_equipo) VALUES
((SELECT id_jugador FROM jugador WHERE apodo = 'Batigol'), (SELECT id_jugador FROM jugador WHERE apodo = 'Titan'), 'BatigolBatistuta/TitanPalermo'),
((SELECT id_jugador FROM jugador WHERE apodo = 'La Pulga'), (SELECT id_jugador FROM jugador WHERE apodo = 'Pelusa'), 'La PulgaMessi/PelusaMaradona'),
((SELECT id_jugador FROM jugador WHERE apodo = 'La Araña'), (SELECT id_jugador FROM jugador WHERE apodo = 'Topo Gigio'), 'La ArañaAlvarez/Topo GigioRiquelme'),
((SELECT id_jugador FROM jugador WHERE apodo = 'Fideo'), (SELECT id_jugador FROM jugador WHERE apodo = 'Gardelito'), 'FideoDi Maria/GardelitoFernandez');

-- Inscribir Jugadores al Torneo 1 (Equipos)
INSERT INTO inscripcion (id_torneo, id_equipo) VALUES
((SELECT id_torneo FROM torneo WHERE nombre_torneo = 'Torneo Verano 2026'), (SELECT id_equipo FROM equipo WHERE nombre_equipo = 'BatigolBatistuta/TitanPalermo')),
((SELECT id_torneo FROM torneo WHERE nombre_torneo = 'Torneo Verano 2026'), (SELECT id_equipo FROM equipo WHERE nombre_equipo = 'La PulgaMessi/PelusaMaradona')),
((SELECT id_torneo FROM torneo WHERE nombre_torneo = 'Torneo Verano 2026'), (SELECT id_equipo FROM equipo WHERE nombre_equipo = 'La ArañaAlvarez/Topo GigioRiquelme')),
((SELECT id_torneo FROM torneo WHERE nombre_torneo = 'Torneo Verano 2026'), (SELECT id_equipo FROM equipo WHERE nombre_equipo = 'FideoDi Maria/GardelitoFernandez'));
