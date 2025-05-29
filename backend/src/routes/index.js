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
    id_torneo,
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
      fecha_cierre_inscripcion,
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



  router.get('/torneos', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM torneo');
      res.json(result.rows);
    } catch (error) {
      console.error('Error al obtener torneos:', error);
      res.status(500).json({ error: 'Error del servidor' });
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





  export default router;
