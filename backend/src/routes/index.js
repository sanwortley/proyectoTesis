    import { Router } from 'express';
    import pool from '../config/db.js';
    import bcrypt from 'bcrypt';
    import { generarGruposAleatorios } from '../utils/generarGrupos.js';



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


  //EDITAR

  // PUT torneo 
  router.put('/torneos/:id', async (req, res) => {
    const { id } = req.params;
    const {
      nombre_torneo,
      categoria,  
      fecha_inicio,
      fecha_fin,
      fecha_cierre_inscripcion,
      max_equipos
    } = req.body;

    try {
      await pool.query(
        `UPDATE torneo SET nombre_torneo=$1, categoria=$2, fecha_inicio=$3, fecha_fin=$4, fecha_cierre_inscripcion=$5, max_equipos=$6 WHERE id_torneo=$7`,
        [nombre_torneo, categoria, fecha_inicio, fecha_fin, fecha_cierre_inscripcion, max_equipos, id]
      );
      res.json({ mensaje: 'Torneo actualizado correctamente' });
    } catch (error) {
      console.error('Error al editar torneo:', error);
      res.status(500).json({ error: 'No se pudo editar el torneo' });
    }
  });

  // PUT equipo 
  router.put('/equipos/:id', async (req, res) => {
    const { id } = req.params;
    const { jugador1_id, jugador2_id, nombre_equipo } = req.body;

    try {
      await pool.query(
        `UPDATE equipo SET jugador1_id=$1, jugador2_id=$2, nombre_equipo=$3 WHERE id_equipo=$4`,
        [jugador1_id, jugador2_id, nombre_equipo, id]
      );
      res.json({ mensaje: 'Equipo actualizado correctamente' });
    } catch (error) {
      console.error('Error al editar equipo:', error);
      res.status(500).json({ error: 'No se pudo editar el equipo' });
    }
  });


  //ELIMINAR

  // DELETE torneo
  router.delete('/torneos/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Borrar inscripciones relacionadas
      await client.query(`
        DELETE FROM inscripcion WHERE id_torneo = $1
      `, [id]);

      // Borrar el torneo
      await client.query(`
        DELETE FROM torneo WHERE id_torneo = $1
      `, [id]);

      await client.query('COMMIT');
      res.json({ mensaje: 'Torneo eliminado correctamente' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al eliminar torneo:', error);
      res.status(500).json({ error: 'No se pudo eliminar el torneo' });
    } finally {
      client.release();
    }
  });



  // DELETE equipo
  router.delete('/equipos/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM inscripcion WHERE id_equipo = $1', [id]);
      await client.query('DELETE FROM equipo WHERE id_equipo = $1', [id]);

      await client.query('COMMIT');
      res.json({ mensaje: 'Equipo eliminado correctamente' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al eliminar equipo:', error);
      res.status(500).json({ error: 'No se pudo eliminar el equipo' });
    } finally {
      client.release();
    }
  });

  router.delete('/torneos/:id/grupos', async (req, res) => {
    const { id } = req.params; // ID del torneo
    const client = await pool.connect();
  
    try {
      await client.query('BEGIN');
  
      // Obtener todos los ID de grupos del torneo
      const gruposRes = await client.query(
        'SELECT id_grupo FROM grupos WHERE id_torneo = $1',
        [id]
      );
  
      const grupoIds = gruposRes.rows.map(row => row.id_grupo);
  
      if (grupoIds.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'No hay grupos para este torneo' });
      }
  
      // Borrar partidos de los grupos
      await client.query(
        'DELETE FROM partidos_grupo WHERE grupo_id = ANY($1)',
        [grupoIds]
      );
  
      // Borrar equipos de los grupos
      await client.query(
        'DELETE FROM equipos_grupo WHERE grupo_id = ANY($1)',
        [grupoIds]
      );
  
      // Borrar los grupos
      await client.query(
        'DELETE FROM grupos WHERE id_torneo = $1',
        [id]
      );
  
      await client.query('COMMIT');
      res.json({ mensaje: 'Grupos del torneo eliminados correctamente' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al eliminar grupos del torneo:', error);
      res.status(500).json({ error: 'No se pudieron eliminar los grupos del torneo' });
    } finally {
      client.release();
    }
  });
  


  //  GENERAR GRUPOS


  router.post('/torneos/:id/generar-grupos', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
  
    try {
      await client.query('BEGIN');
  
      // Traer los equipos inscriptos al torneo
      const equiposRes = await client.query(`
        SELECT e.id_equipo, e.nombre_equipo
        FROM inscripcion i
        JOIN equipo e ON i.id_equipo = e.id_equipo
        WHERE i.id_torneo = $1
      `, [id]);
  
      const equipos = equiposRes.rows;
  
      if (equipos.length < 2) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Se necesitan al menos 2 equipos para generar partidos' });
      }
  
      // 🔥 CASO ESPECIAL: solo 2 equipos → partido final directo
      if (equipos.length === 2) {
        await client.query(`
          INSERT INTO partidos_llave (
            id_torneo, ronda, equipo1_id, equipo2_id, estado
          ) VALUES ($1, 'Final', $2, $3, 'no_iniciado')
        `, [id, equipos[0].id_equipo, equipos[1].id_equipo]);
  
        await client.query('COMMIT');
        return res.json({ mensaje: 'Partido final generado (solo 2 equipos)' });
      }
  
      // 💡 CASO NORMAL: 3 o más equipos → generar grupos
      const grupos = generarGruposAleatorios(equipos);
      const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
      for (let i = 0; i < grupos.length; i++) {
        const nombreGrupo = `Grupo ${letras[i]}`;
  
        // Insertar grupo
        const grupoRes = await client.query(
          `INSERT INTO grupos (id_torneo, nombre) VALUES ($1, $2) RETURNING id_grupo`,
          [id, nombreGrupo]
        );
        const grupoId = grupoRes.rows[0].id_grupo;
  
        // Insertar equipos en equipos_grupo
        for (const equipo of grupos[i]) {
          await client.query(
            `INSERT INTO equipos_grupo (grupo_id, equipo_id) VALUES ($1, $2)`,
            [grupoId, equipo.id_equipo]
          );
        }
  
        // Crear partidos round-robin del grupo
        const participantes = grupos[i];
        for (let j = 0; j < participantes.length; j++) {
          for (let k = j + 1; k < participantes.length; k++) {
            await client.query(
              `INSERT INTO partidos_grupo (grupo_id, equipo1_id, equipo2_id) VALUES ($1, $2, $3)`,
              [grupoId, participantes[j].id_equipo, participantes[k].id_equipo]
            );
          }
        }
      }
  
      await client.query('COMMIT');
      res.json({ mensaje: 'Grupos generados correctamente' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al generar grupos:', error);
      res.status(500).json({ error: 'Error al generar los grupos' });
    } finally {
      client.release();
    }
  });
  


  //  PARTIDOS

  router.get('/torneos/:id/grupos', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
  
    try {
      // Obtener información del torneo y su categoría
      const torneoInfoRes = await client.query(`
        SELECT t.nombre_torneo AS nombre_torneo, c.nombre AS categoria
        FROM torneo t
        JOIN categoria c ON t.categoria = c.id_categoria
        WHERE t.id_torneo = $1
      `, [id]);
      
  
      if (torneoInfoRes.rowCount === 0) {
        return res.status(404).json({ error: 'Torneo no encontrado' });
      }
  
      const { nombre_torneo, categoria } = torneoInfoRes.rows[0];
  
      // Obtener todos los grupos del torneo
      const gruposRes = await client.query(`
        SELECT id_grupo, nombre
        FROM grupos
        WHERE id_torneo = $1
        ORDER BY id_grupo
      `, [id]);
  
      const grupos = [];
  
      for (const grupo of gruposRes.rows) {
        const grupoId = grupo.id_grupo;
  
        // Obtener equipos del grupo
        const equiposRes = await client.query(`
          SELECT 
            eg.equipo_id,
            e.nombre_equipo,
            eg.puntos,
            eg.partidos_jugados,
            eg.sets_favor,
            eg.sets_contra
          FROM equipos_grupo eg
          JOIN equipo e ON eg.equipo_id = e.id_equipo
          WHERE eg.grupo_id = $1
        `, [grupoId]);
  
        // Obtener partidos del grupo
        const partidosRes = await client.query(`
          SELECT 
            pg.id,
            e1.nombre_equipo AS equipo1,
            e2.nombre_equipo AS equipo2,
            pg.set1_equipo1,
            pg.set1_equipo2,
            pg.set2_equipo1,
            pg.set2_equipo2,
            pg.set3_equipo1,
            pg.set3_equipo2,
            pg.estado
          FROM partidos_grupo pg
          JOIN equipo e1 ON pg.equipo1_id = e1.id_equipo
          JOIN equipo e2 ON pg.equipo2_id = e2.id_equipo
          WHERE pg.grupo_id = $1
        `, [grupoId]);
  
        grupos.push({
          id_grupo: grupoId,
          nombre: grupo.nombre,
          equipos: equiposRes.rows,
          partidos: partidosRes.rows
        });
      }
  
      res.json({
        torneo: nombre_torneo,
        categoria ,
        grupos
      });
  
    } catch (error) {
      console.error('Error al obtener grupos:', error);
      res.status(500).json({ error: 'No se pudieron obtener los grupos' });
    } finally {
      client.release();
    }
  });
  
  

// SETS PARTIDOS

router.put('/partidos-grupo/:id', async (req, res) => {
  const { id } = req.params;
  const {
    set1_equipo1, set1_equipo2,
    set2_equipo1, set2_equipo2,
    set3_equipo1, set3_equipo2
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Obtener datos del partido
    const partidoRes = await client.query(`
      SELECT grupo_id, equipo1_id, equipo2_id
      FROM partidos_grupo
      WHERE id = $1
    `, [id]);

    if (partidoRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    const { grupo_id, equipo1_id, equipo2_id } = partidoRes.rows[0];

    // Contar sets ganados por cada equipo
    const sets = [
      [set1_equipo1, set1_equipo2],
      [set2_equipo1, set2_equipo2],
      [set3_equipo1, set3_equipo2]
    ];

    let setsGanados1 = 0;
    let setsGanados2 = 0;
    let setsFavor1 = 0;
    let setsFavor2 = 0;

    for (const [s1, s2] of sets) {
      if (s1 == null || s2 == null) continue;
      if (s1 > s2) setsGanados1++;
      else if (s2 > s1) setsGanados2++;
      setsFavor1 += s1;
      setsFavor2 += s2;
    }

    // Actualizar resultado del partido
    await client.query(`
      UPDATE partidos_grupo
      SET
        set1_equipo1 = $1, set1_equipo2 = $2,
        set2_equipo1 = $3, set2_equipo2 = $4,
        set3_equipo1 = $5, set3_equipo2 = $6,
        estado = 'finalizado'
      WHERE id = $7
    `, [
      set1_equipo1, set1_equipo2,
      set2_equipo1, set2_equipo2,
      set3_equipo1, set3_equipo2,
      id
    ]);

    // Asignar puntos
    const puntos1 = setsGanados1 > setsGanados2 ? 3 : 0;
    const puntos2 = setsGanados2 > setsGanados1 ? 3 : 0;

    // Actualizar equipo 1
    await client.query(`
      UPDATE equipos_grupo
      SET
        puntos = puntos + $1,
        partidos_jugados = partidos_jugados + 1,
        sets_favor = sets_favor + $2,
        sets_contra = sets_contra + $3
      WHERE grupo_id = $4 AND equipo_id = $5
    `, [puntos1, setsFavor1, setsFavor2, grupo_id, equipo1_id]);

    // Actualizar equipo 2
    await client.query(`
      UPDATE equipos_grupo
      SET
        puntos = puntos + $1,
        partidos_jugados = partidos_jugados + 1,
        sets_favor = sets_favor + $2,
        sets_contra = sets_contra + $3
      WHERE grupo_id = $4 AND equipo_id = $5
    `, [puntos2, setsFavor2, setsFavor1, grupo_id, equipo2_id]);

    await client.query('COMMIT');
    res.json({ mensaje: 'Resultado guardado y estadísticas actualizadas' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al guardar resultado:', error);
    res.status(500).json({ error: 'No se pudo guardar el resultado' });
  } finally {
    client.release();
  }
});

  



    export default router;
