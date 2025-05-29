  import { Router } from 'express';
  import pool from '../config/db.js';
  import bcrypt from 'bcrypt';

  


  const router = Router();

  router.get('/', (req, res) => {
    res.send('API funcionando '); 
  });

  //CATEGORIAS
  router.get('/categorias', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM categoria');
      res.json(result.rows);
    } catch (error) {
      console.error('Error al obtener categorías:', error.message);
      res.status(500).json({ error: 'Error del servidor' });
    }
  });
  router.post('/categorias', async (req, res) => {
    const { nombre } = req.body;
  
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
  
    try {
      const result = await pool.query(
        'INSERT INTO categoria (nombre) VALUES ($1) RETURNING *',
        [nombre]
      );
      res.status(201).json({ categoria: result.rows[0] });
    } catch (error) {
      console.error('Error al crear categoría:', error.message);
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

// REGISTRO ORGANIZADORES
router.post('/registro-organizadores', async (req, res) => {
  try {
    const { nombre_jugador, apellido_jugador, email, telefono, password, confirmar_password } = req.body;

    if (password !== confirmar_password) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden' });
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password, rol)
      VALUES ($1, $2, $3, $4, $5, 'organizador')
      RETURNING id_jugador, nombre_jugador, apellido_jugador, email, telefono, rol
    `;

    const values = [nombre_jugador, apellido_jugador, email, telefono, hashedPassword];

    const result = await pool.query(query, values);
    res.status(201).json({ jugador: result.rows[0] });
  } catch (error) {
    console.error('Error al registrar organizador:', error);
    res.status(500).json({ error: 'No se pudo registrar el organizador' });
  }
});

  


  // REGISTRO DE JUGADOR (ahora también funciona como usuario)
router.post('/registro', async (req, res) => {
  try {
    const {
      nombre_jugador,
      apellido_jugador,
      email,
      telefono,
      password,
      confirmar_password
    } = req.body;

    if (password !== confirmar_password) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password, rol)
      VALUES ($1, $2, $3, $4, $5, 'jugador')
      RETURNING id_jugador, nombre_jugador, apellido_jugador, email, telefono, rol
    `;

    const values = [nombre_jugador, apellido_jugador, email, telefono, hashedPassword];

    const result = await pool.query(query, values);
    res.status(201).json({ jugador: result.rows[0] });

  } catch (error) {
    console.error('Error al registrar jugador:', error);
    res.status(500).json({ error: 'No se pudo registrar el jugador' });
  }
});

// JUGADORES
// Obtener todos los jugadores
router.get('/jugadores', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_jugador, nombre_jugador, apellido_jugador FROM jugador`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener jugadores:', error);
    res.status(500).json({ error: 'Error al obtener jugadores' });
  }
});



router.post('/login', async (req, res) => {
  const { login, password } = req.body; // puede ser email o nombre

  try {
    const result = await pool.query(
      `SELECT * FROM jugador WHERE email = $1 `,
      [login]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Jugador no encontrado' });
    }

    const jugador = result.rows[0];

    const match = await bcrypt.compare(password, jugador.password);
    if (!match) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    const { password: _, ...jugadorSinPassword } = jugador;
    res.json({ jugador: jugadorSinPassword });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});



// TORNEOS
router.post('/torneos', async (req, res) => {
  const {
    nombre_torneo, 
    categoria,
    fecha_inicio,
    fecha_fin,
    fecha_cierre_inscripcion,
    max_equipos
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Aseguramos que la fecha cierre tenga hora 23:59:59
    const cierre = new Date(fecha_cierre_inscripcion);
    cierre.setHours(23, 59, 59, 999);

    // Crear torneo
    const insertTorneo = `
      INSERT INTO torneo (
        nombre_torneo, categoria, fecha_inicio, fecha_fin,
        fecha_cierre_inscripcion, max_equipos)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_torneo
    `;

    const { rows } = await client.query(insertTorneo, [
      nombre_torneo,
      categoria,
      fecha_inicio,
      fecha_fin,
      cierre, // usás la fecha con hora incluida
      max_equipos
    ]);

    const torneoId = rows[0].id_torneo;

    await client.query('COMMIT');
    res.status(201).json({ message: 'Torneo creado correctamente', torneoId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error al crear el torneo' });
  } finally {
    client.release();
  }
});


// VERIFICAR CUPO JUGADORES
router.get('/torneos/:id/verificar-cupo', async (req, res) => {
  const { id } = req.params;

  try {
    const torneo = await pool.query('SELECT max_equipos FROM torneo WHERE id_torneo = $1', [id]);
    const inscripciones = await pool.query(`
      SELECT COUNT(*) FROM inscripcion i
      JOIN equipo e ON i.id_equipo = e.id_equipo
      WHERE i.id_torneo = $1
    `, [id]);

    const cupoMaximo = parseInt(torneo.rows[0].max_equipos);
    const inscriptos = parseInt(inscripciones.rows[0].count);

    const lleno = inscriptos >= cupoMaximo;
    res.json({ lleno });
  } catch (error) {
    console.error('Error al verificar cupo:', error);
    res.status(500).json({ error: 'No se pudo verificar el cupo del torneo' });
  }
});




  router.get('/torneos', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM torneo');
      res.json(result.rows);
    } catch (error) {
      console.error('Error al obtener torneos:', error);
      res.status(500).json({ error: 'Error del servidor' });
    }
  });



// Obtener todos los equipos inscriptos en un torneo
router.get('/torneos/:id/equipos', async (req, res) => {
  

  const { id } = req.params;

  try {
    const resultado = await pool.query(`
      SELECT 
        t.nombre_torneo,
        e.id_equipo,
        e.nombre_equipo,
        j1.id_jugador AS jugador1_id,
        j1.nombre_jugador AS nombre_jugador1,
        j1.apellido_jugador AS apellido_jugador1,
        j2.id_jugador AS jugador2_id,
        j2.nombre_jugador AS nombre_jugador2,
        j2.apellido_jugador AS apellido_jugador2
      FROM inscripcion i
      JOIN equipo e ON i.id_equipo = e.id_equipo
      JOIN torneo t ON i.id_torneo = t.id_torneo
      JOIN jugador j1 ON e.jugador1_id = j1.id_jugador
      JOIN jugador j2 ON e.jugador2_id = j2.id_jugador
      WHERE i.id_torneo = $1
    `, [id]);

    res.json({
      nombre_torneo: resultado.rows[0]?.nombre_torneo || 'Torneo desconocido',
      equipos: resultado.rows
    });

    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al obtener equipos del torneo:', error);
    res.status(500).json({ error: 'No se pudo obtener los equipos del torneo' });
  }
});




  // GET /proximo-id-torneo
router.get('/proximo-id-torneo', async (req, res) => {
  try {
    const result = await pool.query('SELECT ultimo_id FROM control_torneo_id');
    const proximoId = result.rows[0].ultimo_id + 1;
    res.json({ id_torneo: proximoId });
  } catch (err) {
    console.error('Error al obtener próximo ID:', err);
    res.status(500).json({ error: 'No se pudo obtener el ID' });
  }
});

// GET /api/torneos/nuevo-id
router.get('/torneos/nuevo-id', async (req, res) => {
  try {
    const result = await pool.query('SELECT ultimo_id FROM control_torneo_id');
    const nuevoId = result.rows[0].ultimo_id + 1;
    res.json({ id_torneo: nuevoId });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo obtener el ID' });
  }
});

// INSCRIPCION JUGADOR
router.post('/inscripcion', async (req, res) => {
  const { jugador1_id, jugador2_id, id_torneo } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const torneo = await client.query(
      `SELECT fecha_cierre_inscripcion FROM torneo WHERE id_torneo = $1`,
      [id_torneo]
    );

    const cierre = new Date(torneo.rows[0].fecha_cierre_inscripcion);
    const hoy = new Date();

    if (hoy > cierre) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La inscripción a este torneo ya está cerrada' });
    }

    // Verificar duplicados
    const check = await client.query(`
      SELECT i.id_inscripcion
      FROM inscripcion i
      JOIN equipo e ON i.id_equipo = e.id_equipo
      WHERE i.id_torneo = $1 AND 
            ((e.jugador1_id = $2 AND e.jugador2_id = $3) OR 
             (e.jugador1_id = $3 AND e.jugador2_id = $2))
    `, [id_torneo, jugador1_id, jugador2_id]);

    if (check.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Este equipo ya está inscrito en el torneo' });
    }

    // Obtener apellidos
    const jugador1 = await client.query('SELECT apellido_jugador FROM jugador WHERE id_jugador = $1', [jugador1_id]);
    const jugador2 = await client.query('SELECT apellido_jugador FROM jugador WHERE id_jugador = $1', [jugador2_id]);

    const apellido1 = jugador1.rows[0].apellido_jugador;
    const apellido2 = jugador2.rows[0].apellido_jugador;

    const [a1, a2] = [apellido1, apellido2].sort();
    const nombre_equipo = `${a1}/${a2}`;

    // Insertar equipo
    const nuevoEquipo = await client.query(
      `INSERT INTO equipo (jugador1_id, jugador2_id, nombre_equipo)
       VALUES ($1, $2, $3) RETURNING id_equipo`,
      [jugador1_id, jugador2_id, nombre_equipo]
    );

    const id_equipo = nuevoEquipo.rows[0].id_equipo;

    // Insertar inscripción
    await client.query(
      `INSERT INTO inscripcion (id_equipo, id_torneo)
       VALUES ($1, $2)`,
      [id_equipo, id_torneo]
    );

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Inscripción exitosa', nombre_equipo });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en inscripción:', error);
    res.status(500).json({ error: 'No se pudo completar la inscripción' });
  } finally {
    client.release();
  }
});

router.post('/verificar-inscripcion', async (req, res) => {
  const { jugador1_id, jugador2_id, id_torneo } = req.body;
  const client = await pool.connect();

  try {
    const check = await client.query(`
      SELECT i.id_inscripcion
      FROM inscripcion i
      JOIN equipo e ON i.id_equipo = e.id_equipo
      WHERE i.id_torneo = $1 AND (
        e.jugador1_id = $2 OR
        e.jugador2_id = $2 OR
        e.jugador1_id = $3 OR
        e.jugador2_id = $3
      )
    `, [id_torneo, jugador1_id, jugador2_id]);

    if (check.rows.length > 0) {
      return res.json({ inscrito: true });
    }

    res.json({ inscrito: false });
  } catch (error) {
    console.error('Error al verificar inscripción:', error);
    res.status(500).json({ error: 'No se pudo verificar la inscripción' });
  } finally {
    client.release();
  }
});







  export default router;
