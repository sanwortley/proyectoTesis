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
      console.error('Error al obtener categorías:', error);
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
  router.post('/torneos', async (req, res) => {
  
    const { nombre, fecha_inicio, fecha_fin, cierre_inscripcion, cantidad_maxima_equipos, id_categoria } = req.body;

    try {
      const result = await pool.query(
        'INSERT INTO torneo (nombre, fecha_inicio, fecha_fin, cierre_inscripcion, cantidad_maxima_equipos, id_categoria) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [nombre, fecha_inicio, fecha_fin, cierre_inscripcion, cantidad_maxima_equipos, id_categoria]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error al crear torneo:', error);
      res.status(500).json({ error: 'No se pudo crear el torneo' });
    }
  });




  export default router;
