import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Rutas principales
import routes from './routes/index.js';

// Rutas de auditoría (log de ingresos)
import auditoriaRoutes from './routes/auditoria.js';
import authRoutes from './routes/auth.js';
import playoffroutes from './routes/playoffroutes.js'
import rankingRoutes from './routes/rankingRoutes.js'
import torneoRoutes from './routes/torneosRoutes.js'

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Montaje de rutas
app.use('/api', routes);
app.use('/api', auditoriaRoutes);
app.use('/api', authRoutes);
app.use('/api', playoffroutes)
app.use('/api', rankingRoutes)
app.use('/api', torneoRoutes)


console.log('[ROUTES] playoff montada');


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log('[ROUTES] auditoria montada');
  
});



export default app;
