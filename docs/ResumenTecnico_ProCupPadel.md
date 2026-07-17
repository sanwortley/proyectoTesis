# Resumen Técnico — Pro Cup Padel
### Proyecto de Tesis Universitaria — Cepeda & Wortley

---

## 1. ¿Qué es el sistema?

**Pro Cup Padel** es una aplicación web full-stack para la gestión integral de torneos de pádel (modalidad dobles/parejas). El sistema cubre todo el ciclo de vida de un torneo: desde la inscripción de equipos hasta la generación del bracket de playoff y el ranking acumulado por categoría.

**Problema que resuelve:** Los torneos de pádel se administran manualmente (planillas, WhatsApp, hojas de cálculo). El sistema automatiza la inscripción, el fixture, los resultados y el ranking, con notificaciones por email.

---

## 2. Arquitectura general

El sistema sigue una arquitectura cliente-servidor clásica de tres capas:

```
FRONTEND (React)         →    BACKEND (Node.js/Express)    →    BASE DE DATOS (PostgreSQL)
Puerto 3000 (prod)            Puerto 3000 (API)                  Puerto 5432
```

**Comunicación:**
- El frontend habla con el backend exclusivamente a través de una API REST (`/api/...`).
- El backend valida, procesa y responde con JSON.
- La autenticación usa JWT (JSON Web Tokens).

**Infraestructura:**
- Local: Docker Compose (3 contenedores: frontend + backend + PostgreSQL).
- Producción: Railway (3 servicios en la nube, con PostgreSQL administrado).

---

## 3. Stack tecnológico

| Capa | Tecnología | Versión | Para qué |
|------|-----------|---------|---------|
| Frontend | React | 19 | Interfaz de usuario SPA |
| Routing frontend | React Router | 7 | Navegación entre páginas |
| HTTP cliente | Axios | latest | Llamadas a la API |
| Gráficos | Recharts | latest | Dashboard con estadísticas |
| Íconos | Lucide React | latest | Íconos en la UI |
| Backend | Node.js + Express | 18 + 5.1 | API REST |
| Módulos JS | ESM (`type: module`) | — | Sintaxis `import/export` |
| Base de datos | PostgreSQL | 13 | Persistencia relacional |
| Driver DB | node-postgres (`pg`) | 8.16 | Conexión a la DB |
| Autenticación | JWT + bcrypt | — | Tokens + hashing de contraseñas |
| Email | Resend SDK | 6.16 | Notificaciones automáticas |
| Tareas programadas | node-cron | 4.5 | Recordatorios 24h antes |
| Archivos | Multer | 2.0 | Subida de fotos de perfil |
| Contenedores | Docker + Compose | — | Entorno reproducible |
| Deploy | Railway | — | Nube (producción) |

---

## 4. Base de datos — Esquema

### 4.1 Tablas y sus campos clave

**`categoria`** — Las divisiones del deporte.
- `id_categoria`, `nombre` (ej: "5ta"), `valor_numerico` (INT 2-8)
- El `valor_numerico` es clave: se usa para validar inscripciones y calcular rankings.

**`jugador`** — Usuarios del sistema.
- `id_jugador`, `nombre_jugador`, `apellido_jugador`, `apodo`, `email` (UNIQUE), `password` (hash bcrypt), `rol` ('jugador' | 'organizador'), `categoria_id`, `foto_perfil`

**`equipo`** — Pareja de jugadores.
- `id_equipo`, `jugador1_id`, `jugador2_id`, `nombre_equipo` (auto-generado como "Apellido1/Apellido2")

**`torneo`** — Torneos.
- `id_torneo`, `nombre_torneo`, `fecha_inicio`, `fecha_fin`, `fecha_cierre_inscripcion`, `max_equipos`
- `formato_categoria`: 'categoria_fija' (solo juegan jugadores de una cat) o 'suma' (suma de valores numéricos de ambos jugadores debe ser X)
- `modalidad`: 'fin_de_semana' (grupos + playoff en 1 fin de semana) o 'liga' (fixture round-robin semanal)
- `dias_juego`: para liga, ej. "Lunes,Miércoles"

**`inscripcion`** — Qué equipo está en qué torneo.
- `id_inscripcion`, `id_equipo`, `id_torneo`

**`grupos`** — Grupos de la fase de grupos (ej: "Grupo A", "Grupo B").
- `id_grupo`, `id_torneo`, `nombre`

**`equipos_grupo`** — Tabla de estadísticas por equipo dentro de un grupo.
- `grupo_id`, `equipo_id`, `puntos`, `partidos_jugados`, `sets_favor`, `sets_contra`, `games_favor`, `games_contra`

**`partidos_grupo`** — Partidos de la fase de grupos.
- `id`, `grupo_id`, `equipo1_id`, `equipo2_id`
- Sets: `set1_equipo1`, `set1_equipo2`, `set2_equipo1`, `set2_equipo2`, `set3_equipo1`, `set3_equipo2`
- `estado`: 'no_iniciado' | 'finalizado'
- `fecha`: para modalidad liga (cuándo se juega)

**`partidos_llave`** — Partidos del bracket playoff.
- `id`, `id_torneo`, `ronda` ('OCTAVOS' | 'CUARTOS' | 'SEMIS' | 'FINAL'), `orden`
- `equipo1_id`, `equipo2_id`, `ganador_id`
- **`next_match_id`**: FK a sí misma → el partido al que avanza el ganador
- **`next_slot`**: 1 o 2 → si el ganador entra como equipo1 o equipo2 del siguiente partido

**`ranking_jugador`** — Ranking acumulado histórico.
- `jugador_id`, `torneo_participado`, `fase_llegada`, `puntos`, `categoria`
- ⚠️ `categoria` guarda `valor_numerico` (2-8), NO el `id_categoria`. Importante en la defensa.

**`audit_log_ingresos`** — Auditoría de logins.
- `jugador_id`, `nombre`, `apellido`, `ip`, `user_agent`, `exitoso` (bool), `motivo`, `timestamp`

### 4.2 Relaciones clave

```
jugador --< equipo (jugador1_id, jugador2_id)
equipo --< inscripcion >-- torneo
torneo --< grupos --< equipos_grupo >-- equipo
grupos --< partidos_grupo
torneo --< partidos_llave (self-ref via next_match_id)
```

---

## 5. Backend — API REST

### 5.1 Estructura de archivos

```
backend/src/
├── app.mjs              # Entry point, monta rutas en /api
├── config/
│   ├── db.js            # Pool de conexiones PostgreSQL
│   └── multer.js        # Configuración de subida de archivos
├── routes/
│   ├── index.js         # Rutas principales (login, jugadores, torneos, grupos, inscripciones)
│   ├── auth.js          # Middleware JWT + ruta /login (authController)
│   ├── playoffRoutes.js # Rutas de playoff
│   ├── rankingRoutes.js # Rutas de ranking
│   ├── torneoRoutes.js  # Rutas extra de torneos
│   └── auditoriaRoutes.js # Rutas de auditoría
├── controllers/
│   └── authController.js # Lógica de login con diagnósticos
└── utils/
    ├── generarGrupos.js  # Algoritmo de distribución aleatoria de grupos
    ├── generarPlayoff.js # Algoritmo de bracket playoff
    ├── mailer.js         # Envío de emails (Resend SDK)
    ├── logIngreso.js     # Registro de auditoría
    └── fileAudit.js      # Log a archivo CSV/JSONL
```

### 5.2 Endpoints principales

**Autenticación:**
- `POST /api/login` — Recibe email + password, devuelve JWT + datos del jugador
- `POST /api/registro` — Registro de jugador (rol: 'jugador')
- `POST /api/registro-organizadores` — Registro de organizador (requiere `admin_token` secreto)

**Jugadores:**
- `GET /api/jugadores` — Lista todos los jugadores
- `POST /api/jugadores` — Crea jugador (requiere auth + rol organizador)
- `PUT /api/jugadores/:id` — Edita perfil (propio o si es organizador) + foto con Multer
- `DELETE /api/jugadores/:id` — Elimina jugador

**Torneos:**
- `POST /api/torneos` — Crea torneo
- `GET /api/torneos` — Lista torneos (con filtro por año)
- `PUT /api/torneos/:id` — Edita torneo
- `DELETE /api/torneos/:id` — Elimina torneo

**Inscripciones:**
- `POST /api/inscripcion` — Inscribe un equipo (valida categoría, cupo, superposición de fechas)
- `POST /api/verificar-inscripcion` — Verifica si los jugadores ya están inscriptos
- `GET /api/torneos/:id/verificar-cupo` — Verifica si hay lugar

**Grupos:**
- `POST /api/torneos/:id/generar-grupos` — Genera grupos + fixture automático
- `GET /api/torneos/:id/grupos` — Devuelve grupos con equipos y partidos
- `DELETE /api/torneos/:id/grupos` — Borra grupos del torneo
- `PUT /api/partidos-grupo/:id` — Carga resultado de un partido de grupos (actualiza estadísticas + auto-genera playoff si todos finalizaron)

**Playoff:**
- `POST /api/torneos/:id/playoff` — Genera bracket (idempotente)
- `GET /api/torneos/:id/playoff` — Devuelve el bracket completo por rondas
- `PUT /api/torneos/:id/playoff/partidos/:idPartido` — Carga resultado y avanza al ganador al siguiente partido

**Dashboard y ranking:**
- `GET /api/dashboard/kpis` — Totales (jugadores, torneos, inscriptos)
- `GET /api/dashboard/stats` — Estadísticas por categoría
- `GET /api/dashboard/alerts` — Torneos próximos a vencer inscripción
- `GET /api/ranking` — Ranking por categoría (filtro por `valor_numerico`)
- `GET /api/categorias` — Lista categorías

### 5.3 Autenticación y autorización

El middleware `requireAuth` verifica el JWT en el header `Authorization: Bearer <token>`:

```js
const payload = jwt.verify(token, process.env.JWT_SECRET);
req.user = { id: payload.id, role: payload.role };
```

El middleware `esOrganizador` verifica que `req.user.role === 'organizador'`.

Las rutas se protegen encadenando middlewares:
```js
router.post('/jugadores', requireAuth, esOrganizador, async (req, res) => { ... });
```

---

## 6. Lógica de negocio — Algoritmos clave

### 6.1 Generación de grupos (modalidad fin de semana)

Archivo: `backend/src/utils/generarGrupos.js`

- Los equipos se distribuyen aleatoriamente en grupos.
- Se usa una lógica de distribución equitativa (grupos de 3 o 4 equipos según el total).
- Dentro de cada grupo, se generan todos los partidos posibles (round-robin): si hay N equipos en un grupo, hay N×(N-1)/2 partidos.

### 6.2 Generación de fixture Liga (round-robin)

Archivo: `backend/src/routes/index.js` (sección modalidad 'liga')

- Se crea un único grupo ("Liga Única") con todos los equipos.
- Se aplica el **algoritmo de Berger** (también llamado "torneo de round robin con rotación"):
  - Se fija el primer equipo, los demás rotan en sentido horario.
  - En cada ronda, los equipos se emparejan como: i-th vs (n-1-i)-th.
  - Se genera una fecha de partido por ronda, respetando los `dias_juego` configurados.
- Al finalizar, se actualiza `fecha_fin` del torneo automáticamente.

### 6.3 Generación de Playoff (bracket eliminatorio)

Archivo: `backend/src/utils/generarPlayoff.js`

**Algoritmo:**
1. Toma los **top 2 de cada grupo** por puntos (desempate: sets, games).
2. Aplica **snake-seeding** para los cruces:
   - 1ro del Grupo A vs 2do del Grupo B
   - 1ro del Grupo B vs 2do del Grupo A
   - etc.
3. Casos especiales:
   - **1 grupo, ≤4 equipos:** directo a Final o Semis.
   - **3 grupos (6 equipos):** los 2 mejores pasan directo a semis con BYE; los 4 restantes juegan play-in.
   - **N grupos general:** se calcula la potencia de 2 más cercana (4, 8, 16...) y los mejores seeds reciben BYE.
4. Para cada partido, se asigna `next_match_id` y `next_slot` (1 o 2), formando la cadena del bracket.
5. Cuando se carga el resultado de un partido, el ganador **avanza automáticamente** al siguiente partido (`UPDATE partidos_llave SET equipo1_id/equipo2_id WHERE id = next_match_id`).
6. Al finalizar la FINAL, se genera automáticamente el **ranking** del torneo.

### 6.4 Cálculo de ranking

Puntos por fase alcanzada:
| Fase | Puntos |
|------|--------|
| Campeón (FINAL ganada) | 2000 |
| Subcampeón (FINAL perdida) | 1200 |
| Semifinal | 720 |
| Cuartos de final | 360 |
| Octavos de final | 180 |
| Fase de grupos | 0 |

Los puntos se acumulan histórica y separados por `categoria` (usando `valor_numerico`).

### 6.5 Validación de inscripción

Al inscribir un equipo, el sistema verifica (en orden):
1. Que el torneo no tenga cierre de inscripción vencido.
2. Que ningún jugador ya esté inscripto en **otro torneo que se superponga por fechas**.
3. Que ningún jugador ya esté inscripto en **este torneo**.
4. Que la categoría sea válida:
   - `categoria_fija`: ambos jugadores deben tener la misma categoría que el torneo.
   - `suma`: `valor_numerico(j1) + valor_numerico(j2) === suma_categoria`.

---

## 7. Frontend — React SPA

### 7.1 Estructura de páginas

| Página | Ruta | Acceso |
|--------|------|--------|
| Login | `/` | Público |
| Registro jugador | `/registro` | Público |
| Registro admin | `/registro-admin` | Público (token) |
| Home/Dashboard visual | `/home-*` | Todos los roles |
| Crear torneo | `/crear-torneo` | Organizador |
| Cargar resultado | `/cargar-resultado` | Organizador |
| Ver torneo (bracket) | `/torneosllave` | Todos |
| Mis torneos (organizador) | `/organizador/torneos` | Organizador |
| Dashboard admin | `/dashboard` | Organizador |
| Administrar jugadores | `/admin/jugadores` | Organizador |
| Inscripción | `/inscripcion` | Jugador |
| Perfil | `/perfil` | Jugador / Organizador |
| Ranking | `/ranking` | Todos |

### 7.2 Autenticación en el frontend

- Al hacer login, el backend devuelve `{ token, jugador }`.
- El `token` y los datos del usuario se guardan en `localStorage`.
- Todas las llamadas a endpoints protegidos incluyen el header `Authorization: Bearer <token>` (configurado globalmente en Axios).
- `ProtectedRoute` es un wrapper de React Router que verifica el rol del usuario y redirige si no tiene acceso.
- El contexto `AuthContext` distribuye el estado del usuario en toda la app sin prop-drilling.

### 7.3 Componentes principales

**`PlayoffBrackets.js`:** Visualización del bracket eliminatorio. Lee la estructura de rondas del backend y renderiza los cruces visualmente, mostrando equipos, sets, y el ganador de cada partido.

**`TeamAvatar.js`:** Muestra el avatar de un equipo compuesto por las fotos de perfil de los dos jugadores.

**`Navbar.js`:** Barra de navegación dinámica — muestra menús distintos según el rol del usuario autenticado.

**`CargarResultado.js`:** Formulario para cargar sets de un partido. Valida marcadores válidos de pádel (6-0 a 6-4, 7-5, 7-6, tie-break). Detecta automáticamente si el partido es de grupos o de playoff y llama al endpoint correspondiente.

### 7.4 Dashboard con gráficos

La página `/dashboard` usa **Recharts** para mostrar:
- KPIs: total de jugadores, torneos, inscripciones.
- Estadísticas de participación por categoría.
- Alertas de torneos con inscripción próxima a vencer.
- Estado de torneos activos.

---

## 8. Funcionalidades transversales

### 8.1 Notificaciones por email

Librería: **Resend SDK** (servicio de email transaccional).

Se envían dos tipos de emails automáticos:
1. **Confirmación de inscripción:** cuando un equipo se inscribe a un torneo. Se envía a ambos jugadores con los datos del torneo.
2. **Recordatorio 24 horas antes:** job programado con `node-cron` que corre diariamente y envía recordatorio a los equipos con partido al día siguiente.

Los emails están diseñados con HTML inline (estilo Pro Cup Padel: fondo negro, dorado).

### 8.2 Fotos de perfil

- Los jugadores pueden subir una foto de perfil desde la página `/perfil`.
- La foto se envía al backend como `multipart/form-data` usando Axios FormData.
- El backend usa **Multer** para recibir el archivo y guardarlo en `backend/uploads/perfiles/`.
- El path relativo se guarda en `jugador.foto_perfil` y el frontend lo usa para mostrar el avatar.

### 8.3 Auditoría de accesos

Cada intento de login (exitoso o fallido) genera un registro que se guarda en:
- La tabla `audit_log_ingresos` en PostgreSQL.
- Archivos CSV y JSONL en el servidor (`logs/audit_ingresos.csv`, `logs/audit_ingresos.jsonl`).

Los campos registrados: IP del cliente, User-Agent (browser), usuario, éxito/fallo, motivo.

---

## 9. Seguridad

| Aspecto | Implementación |
|---------|---------------|
| Contraseñas | Hash bcrypt con salt factor 10 (`$2b$10$...`) |
| Autenticación | JWT con expiración de 6 horas, firmado con `JWT_SECRET` |
| Autorización | Middleware por rol (`requireAuth`, `esOrganizador`) |
| Registro de admins | Token secreto (`ADMIN_SECRET`) requerido para crear organizadores |
| CORS | Configurado con `origin: true` en Express (producción acepta cualquier origen) |
| Variables de entorno | Todas las credenciales en `.env` (nunca en el código) |

---

## 10. Deploy en Railway (producción)

Railway es una plataforma de hosting en la nube similar a Heroku. El proyecto tiene 3 servicios:

**Backend:**
- Imagen: Docker (Dockerfile en `/backend`)
- Variables de entorno: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_SECRET`, `RESEND_API_KEY`, `PORT`
- URL: `proyectotesis-production-b7ce.up.railway.app`

**Frontend:**
- Imagen: Docker multi-stage (build con CRA → servido con `serve`)
- Variable de entorno: `REACT_APP_API_URL` = URL del backend (se bake en el build)
- URL: `proyectotesis-production-6cb8.up.railway.app`

**PostgreSQL:**
- Servicio administrado de Railway
- La variable `DATABASE_URL` del backend apunta a la DB de Railway con `${{Postgres.DATABASE_URL}}`

**Proceso de deploy:**
1. `git push origin optimized-version` → GitHub recibe el push
2. Railway detecta el cambio y rebuilda automáticamente los contenedores
3. El frontend se construye con `npm run build` (en Docker) usando `REACT_APP_API_URL` como ARG
4. El backend arranca con `node src/app.mjs`

---

## 11. Preguntas frecuentes de defensa

**¿Por qué Node.js y no otro lenguaje?**
JavaScript en el backend permite compartir lógica de validación con el frontend y es ideal para APIs REST por su modelo de I/O no bloqueante (manejo eficiente de múltiples conexiones simultáneas).

**¿Por qué PostgreSQL y no MongoDB?**
Los datos del sistema son fuertemente relacionales (jugadores → equipos → inscripciones → grupos → partidos). Un modelo relacional con FK y transacciones garantiza integridad de datos, especialmente importante en operaciones como inscripción (varios inserts atómicos).

**¿Qué es un JWT y cómo funciona?**
Un JSON Web Token es un string codificado en base64 con tres partes: header (algoritmo), payload (datos del usuario: id, rol), y firma (hash con clave secreta). El backend lo genera al hacer login, el frontend lo guarda y lo adjunta a cada request. El backend solo verifica la firma, sin necesitar ir a la base de datos en cada request protegido.

**¿Cómo se garantiza que dos jugadores no puedan inscribirse en dos torneos que se pisan?**
La ruta `POST /api/inscripcion` hace una query SQL que busca si alguno de los dos jugadores tiene inscripciones en torneos cuyo rango de fechas se superpone con el torneo nuevo. Si hay superposición, devuelve 400 con el mensaje de error.

**¿Qué es Docker Compose y por qué se usa?**
Docker Compose permite definir en un archivo YAML (`docker-compose.yml`) los 3 servicios del sistema (DB + backend + frontend), sus variables de entorno, y cómo se comunican entre sí. Con `docker-compose up --build` se levanta todo el sistema en cualquier máquina sin instalar nada manualmente.

**¿Cómo funciona el snake-seeding del playoff?**
El objetivo es evitar que los dos mejores equipos se enfrenten antes de la final. Se ordenan todos los clasificados por ranking (puntos en grupos, luego sets, luego games) y se los empareja en espejo: el 1ro vs el último, el 2do vs el penúltimo, etc.

**¿Por qué el ranking usa `valor_numerico` y no `id_categoria`?**
Porque el sistema soporta torneos de tipo "suma" donde la categoría de la pareja no es una categoría fija sino la suma de los valores numéricos de cada jugador. Para poder comparar correctamente quién está en qué categoría al calcular el ranking, se usa siempre el valor numérico (2-8) como eje de agrupación.

**¿Qué pasa si el servidor de email no está configurado?**
El sistema es resiliente: el cliente Resend se inicializa solo si `RESEND_API_KEY` está definida. Si no, las funciones de email hacen `return` silenciosamente sin tirar error. El flujo de inscripción completa igual.

---

## 12. Flujo completo de un torneo (de punta a punta)

```
1. [Admin] Crea el torneo con formato, fechas, y máximo de equipos
2. [Jugadores] Se registran en el sistema y se inscriben en parejas
   → Sistema valida categorías y superposición de fechas
   → Se envía email de confirmación a ambos jugadores
3. [Admin] Genera grupos (la distribución es automática y aleatoria)
   → Sistema crea grupos, reparte equipos, y genera fixture round-robin dentro de cada grupo
4. [Admin] Carga resultados partido a partido
   → Sistema actualiza estadísticas (puntos, sets, games)
   → Cuando todos los partidos de grupos terminan → genera el playoff automáticamente
5. [Admin] Carga resultados del playoff partido a partido
   → El ganador avanza automáticamente al siguiente partido del bracket
   → Al terminar la FINAL → se genera el ranking del torneo
6. [Todos] Pueden ver el bracket, las posiciones y el ranking en tiempo real
```

---

*Resumen generado para el proyecto de tesis "Pro Cup Padel" — Cepeda & Wortley, 2026.*
