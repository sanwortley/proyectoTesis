-- Crear torneo 5ta categoría (LIGA por fechas — Miércoles y Viernes)
BEGIN;

-- 1) Insertar torneo y obtener su id
DO $$
DECLARE
  cat_id INT;
  torneo_id INT;
BEGIN
  SELECT id_categoria INTO cat_id FROM categoria WHERE valor_numerico = 5; -- 5ta
  IF cat_id IS NULL THEN
    RAISE EXCEPTION 'No existe categoría 5ta (valor_numerico=5)';
  END IF;

  INSERT INTO torneo (
    nombre_torneo, fecha_inicio, fecha_fin, fecha_cierre_inscripcion, max_equipos,
    categoria_id, formato_categoria, suma_categoria, modalidad, dias_juego
  ) VALUES (
    'Torneo 5ta Categoria - Liga (Miércoles/Viernes)',
    '2026-06-24'::date, '2026-08-07'::date, '2026-06-22'::date, 16,
    cat_id, 'categoria_fija', NULL, 'liga', 'miercoles,viernes'
  ) RETURNING id_torneo INTO torneo_id;

  RAISE NOTICE 'Creando Torneo 5ta con ID: %', torneo_id;

  -- 2) Crear 32 jugadores reales (16 parejas)
  INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password, categoria_id)
  VALUES
    ('Juan','Pérez','juan.perez@example.com','11-4000-0001','pass123',cat_id),
    ('Luis','Gómez','luis.gomez@example.com','11-4000-0002','pass123',cat_id),
    ('Martín','Rodríguez','martin.rodriguez@example.com','11-4000-0003','pass123',cat_id),
    ('Sergio','López','sergio.lopez@example.com','11-4000-0004','pass123',cat_id),
    ('Federico','García','federico.garcia@example.com','11-4000-0005','pass123',cat_id),
    ('Diego','Fernández','diego.fernandez@example.com','11-4000-0006','pass123',cat_id),
    ('Gabriel','Martínez','gabriel.martinez@example.com','11-4000-0007','pass123',cat_id),
    ('Santiago','González','santiago.gonzalez@example.com','11-4000-0008','pass123',cat_id),
    ('Matías','Suárez','matias.suarez@example.com','11-4000-0009','pass123',cat_id),
    ('Nicolás','Torres','nicolas.torres@example.com','11-4000-0010','pass123',cat_id),
    ('Joaquín','Ramírez','joaquin.ramirez@example.com','11-4000-0011','pass123',cat_id),
    ('Lucas','Vargas','lucas.vargas@example.com','11-4000-0012','pass123',cat_id),
    ('Facundo','Ramos','facundo.ramos@example.com','11-4000-0013','pass123',cat_id),
    ('Agustín','Romero','agustin.romero@example.com','11-4000-0014','pass123',cat_id),
    ('Ezequiel','Castro','ezequiel.castro@example.com','11-4000-0015','pass123',cat_id),
    ('Bruno','Herrera','bruno.herrera@example.com','11-4000-0016','pass123',cat_id),
    ('Emiliano','Molina','emiliano.molina@example.com','11-4000-0017','pass123',cat_id),
    ('Thiago','Rossi','thiago.rossi@example.com','11-4000-0018','pass123',cat_id),
    ('Lautaro','Marin','lautaro.marin@example.com','11-4000-0019','pass123',cat_id),
    ('Ian','Suarez','ian.suarez@example.com','11-4000-0020','pass123',cat_id),
    ('Bruno','Cruz','bruno.cruz@example.com','11-4000-0021','pass123',cat_id),
    ('Emanuel','Diaz','emanuel.diaz@example.com','11-4000-0022','pass123',cat_id),
    ('Axel','Ortega','axel.ortega@example.com','11-4000-0023','pass123',cat_id),
    ('Maximiliano','Silva','maximiliano.silva@example.com','11-4000-0024','pass123',cat_id),
    ('Dante','Suarez','dante.suarez@example.com','11-4000-0025','pass123',cat_id),
    ('Luca','Vega','luca.vega@example.com','11-4000-0026','pass123',cat_id),
    ('Tobías','Núñez','tobias.nunez@example.com','11-4000-0027','pass123',cat_id),
    ('Ezequiel','Morales','ezequiel.morales@example.com','11-4000-0028','pass123',cat_id),
    ('Matías','Méndez','matias.mendez@example.com','11-4000-0029','pass123',cat_id),
    ('Rodrigo','Aguirre','rodrigo.aguirre@example.com','11-4000-0030','pass123',cat_id),
    ('Valentino','Rossi','valentino.rossi@example.com','11-4000-0031','pass123',cat_id),
    ('Felipe','Paz','felipe.paz@example.com','11-4000-0032','pass123',cat_id);

  -- 3) Crear 16 equipos uniendo pares consecutivos y registrarlos en el torneo
  DO $$
  DECLARE
    j INT;
    team_name TEXT;
    t_id INT := torneo_id;
    p1 INT;
    p2 INT;
  BEGIN
    FOR j IN 1..31 BY 2 LOOP
      SELECT id_jugador INTO p1 FROM jugador WHERE email = (SELECT array_agg(email ORDER BY id_jugador)[j]) LIMIT 1;
      -- Above line is a safe placeholder, but we'll select by offset from newest inserts using ROW_NUMBER
      -- Simpler approach: use ORDER BY id_jugador OFFSET j-1 LIMIT 1
      SELECT id_jugador INTO p1 FROM (
        SELECT id_jugador, ROW_NUMBER() OVER (ORDER BY id_jugador) AS rn FROM jugador WHERE categoria_id = cat_id
      ) x WHERE rn = j;
      SELECT id_jugador INTO p2 FROM (
        SELECT id_jugador, ROW_NUMBER() OVER (ORDER BY id_jugador) AS rn FROM jugador WHERE categoria_id = cat_id
      ) y WHERE rn = j+1;

      team_name := 'Equipo 5ta ' || ((j+1)/2);
      INSERT INTO equipo (jugador1_id, jugador2_id, nombre_equipo)
      VALUES (p1, p2, team_name);

      INSERT INTO inscripcion (id_equipo, id_torneo)
      VALUES (currval('equipo_id_equipo_seq'), t_id);
    END LOOP;
  END $$;

  RAISE NOTICE 'Se han creado 16 equipos e inscripciones para torneo %', torneo_id;
END $$;

COMMIT;
