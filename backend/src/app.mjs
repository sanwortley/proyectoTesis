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

// Servir carpetas estáticas (uploads)
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// app.mjs está en src/, uploads está en ../uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Montaje de rutas
import dashboardRoutes from './routes/dashboardRoutes.js';

app.use('/api', routes);
app.use('/api', auditoriaRoutes);
app.use('/api', authRoutes);
app.use('/api', playoffroutes);
app.use('/api', rankingRoutes);
app.use('/api', torneoRoutes);
app.use('/api/dashboard', dashboardRoutes);


console.log('[ROUTES] playoff montada');


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log('[ROUTES] auditoria montada');

});



export default app;
