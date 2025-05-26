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

  //REGISTRO ORGANIZADORES
  router.post('/registro-organizadores', async (req, res) => {
    try {
      const { nombre_completo, email, telefono, password, confirmar_password } = req.body;
  
      if (password !== confirmar_password) {
        return res.status(400).json({ error: 'Las contraseñas no coinciden' });
      }
  
      // Hashear la contraseña
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      const query = `
        INSERT INTO usuario (nombre_completo, email, telefono, password, rol)
        VALUES ($1, $2, $3, $4, 'organizador')
        RETURNING id_usuario, nombre_completo, email, telefono, rol
      `;
  
      const values = [nombre_completo, email, telefono, hashedPassword];
  
      const result = await pool.query(query, values);
      res.status(201).json({ usuario: result.rows[0] });
    } catch (error) {
      console.error('Error al registrar organizador:', error);
      res.status(500).json({ error: 'No se pudo registrar el organizador' });
    }
  });
  


  //REGISTRO
  router.post('/registro', async (req, res) => {
    try {
      const { nombre_completo, email, telefono, password, confirmar_password } = req.body;

      if (password !== confirmar_password) {
        return res.status(400).json({ error: 'Las contraseñas no coinciden' });
      }

      // Hashear la contraseña
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insertar en base de datos (rol por defecto: 'jugador')
      const query = `
        INSERT INTO usuario (nombre_completo, email, telefono, password)
        VALUES ($1, $2, $3, $4)
        RETURNING id_usuario, nombre_completo, email, telefono, rol
      `;
      const values = [nombre_completo, email, telefono, hashedPassword];

      const result = await pool.query(query, values);
      res.status(201).json({ usuario: result.rows[0] });
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      res.status(500).json({ error: 'No se pudo registrar el usuario' });
    }
  });



  //LOGIN
  router.post('/login', async (req, res) => {
    const { login, password } = req.body; // login puede ser email o nombre completo
  
    try {
      // Buscar al usuario por email o nombre completo
      const result = await pool.query(
        'SELECT * FROM usuario WHERE email = $1 OR nombre_completo = $1',
        [login]
      );
  
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }
  
      const usuario = result.rows[0];
  
      // Comparar la contraseña ingresada con la hasheada
      const match = await bcrypt.compare(password, usuario.password);
      if (!match) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }
  
      // Eliminar la contraseña antes de enviar al frontend
      const { password: _, ...userWithoutPassword } = usuario;
  
      res.json({ usuario: userWithoutPassword });
  
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error del servidor' });
    }
  });


  //TORNEOS
  // POST /torneos
  router.post('/torneos', async (req, res) => {
    const { nombre, fecha_inicio, fecha_fin, cierre_inscripcion, cantidad_maxima_equipos, id_categoria } = req.body;
  
    try {
      await pool.query('BEGIN');
  
      // Obtener el próximo ID real basado en la BD
      const maxIdResult = await pool.query('SELECT MAX(id_torneo) AS max_id FROM torneo');
      const nuevoId = (maxIdResult.rows[0].max_id || 0) + 1;
  
      // Insertar torneo con el nuevo ID
      await pool.query(
        `INSERT INTO torneo (id_torneo, nombre, fecha_inicio, fecha_fin, cierre_inscripcion, cantidad_maxima_equipos, id_categoria)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [nuevoId, nombre, fecha_inicio, fecha_fin, cierre_inscripcion, cantidad_maxima_equipos, id_categoria]
      );
  
      // Actualizar el control solo si es necesario
      await pool.query('UPDATE control_torneo_id SET ultimo_id = $1 WHERE ultimo_id < $1', [nuevoId]);
  
      await pool.query('COMMIT');
      res.status(201).json({ mensaje: 'Torneo creado con éxito', id_torneo: nuevoId });
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error('Error al crear torneo:', err);
      res.status(500).json({ error: 'Error al crear torneo' });
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
