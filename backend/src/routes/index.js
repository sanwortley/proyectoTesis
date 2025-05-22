import { Router } from 'express';
import pool from '../config/db.js';


const router = Router();

router.get('/', (req, res) => {
  res.send('API funcionando ');
});

router.get('/categorias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categoria');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
