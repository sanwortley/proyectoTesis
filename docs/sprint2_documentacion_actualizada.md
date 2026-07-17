# Pro Cup Padel — Documentación Técnica Sprint 2 (Actualizada)

> **Estado:** Revisado contra código real — Junio 2026
> Usar este documento como fuente para actualizar el informe formal.

---

## 1. Diagrama Entidad-Relación (DER) — Estado Real

### Tablas existentes y sus relaciones

```
categoria (1) ─────────────────────────── (N) jugador
categoria (1) ─────────────────────────── (N) torneo [solo si categoria_fija]

torneo (1) ──────────────────────────────── (N) inscripcion
torneo (1) ──────────────────────────────── (N) grupos
torneo (1) ──────────────────────────────── (N) partidos_llave

jugador (1) ──────────────────────────────── (N) ranking_jugador
jugador (1) ──────── como jugador1_id ─────── (N) equipo
jugador (1) ──────── como jugador2_id ─────── (N) equipo

equipo (1) ──────────────────────────────── (N) inscripcion
equipo (1) ──── via inscripcion ──────────── (N) torneo

grupos (1) ──────────────────────────────── (N) equipos_grupo
grupos (1) ──────────────────────────────── (N) partidos_grupo

equipo (1) ──── como equipo_id ──────────── (N) equipos_grupo
equipo (1) ──── como equipo1_id/2_id ─────── (N) partidos_grupo
equipo (1) ──── como equipo1_id/2_id ─────── (N) partidos_llave
equipo (1) ──── como ganador_id ─────────── (N) partidos_llave
```

### Correcciones respecto al DER del informe anterior

| En el informe (incorrecto)      | En el sistema real                              |
|---------------------------------|-------------------------------------------------|
| Entidad "Pareja"                | Entidad `equipo` (mismo concepto, distinto nombre) |
| Entidad "Partido" (una sola)    | Dos tablas: `partidos_grupo` + `partidos_llave` |
| Entidad "Resultado" separada    | Resultado embebido en `partidos_grupo` y `partidos_llave` (campos set1..set3) |
| Entidad "Transmision"           | NO IMPLEMENTADA — pendiente de sprint futuro    |
| Entidad "Multimedia"            | NO IMPLEMENTADA — pendiente de sprint futuro    |
| Jugador.dni                     | Campo NO existe en la base de datos             |
| Equipo.id_torneo                | No existe; la relación pasa por `inscripcion`   |
| Equipo.ranking                  | No existe en `equipo`; existe tabla separada `ranking_jugador` |
| No existe en el informe         | `grupos`, `equipos_grupo`, `categoria`, `audit_log_ingresos` |

---

## 2. Diccionario de Datos (completo y correcto)

### 2.1 Tabla: `categoria`

| Columna          | Tipo         | Restricciones              | Descripción                       |
|------------------|--------------|----------------------------|------------------------------------|
| id_categoria     | SERIAL       | PK                         | Identificador único                |
| nombre           | VARCHAR(50)  | NOT NULL                   | Nombre (ej: "4ta", "5ta")         |
| valor_numerico   | INT          | NOT NULL, CHECK (2..8)     | Valor entero de la categoría       |

**Valores seed:** 2da=2, 3ra=3, 4ta=4, 5ta=5, 6ta=6, 7ma=7, 8va=8

---

### 2.2 Tabla: `torneo`

| Columna                   | Tipo          | Restricciones                          | Descripción                                           |
|---------------------------|---------------|----------------------------------------|-------------------------------------------------------|
| id_torneo                 | SERIAL        | PK                                     | Identificador único                                   |
| nombre_torneo             | VARCHAR(100)  | NOT NULL                               | Nombre descriptivo del torneo                        |
| fecha_inicio              | DATE          | NOT NULL                               | Inicio del torneo                                    |
| fecha_fin                 | DATE          | NOT NULL                               | Fin del torneo (auto-calculada en modo liga)         |
| fecha_cierre_inscripcion  | DATE          | NOT NULL                               | Fecha límite para inscribirse                        |
| max_equipos               | INT           | NOT NULL                               | Cupo máximo de equipos                               |
| categoria_id              | INT           | FK → categoria, NULL si suma           | Categoría única (solo modo categoria_fija)           |
| formato_categoria         | VARCHAR(20)   | NOT NULL, IN ('categoria_fija','suma') | Modo de validación de categorías                     |
| suma_categoria            | INT           | NULL si categoria_fija                 | Suma objetivo (solo modo suma)                       |
| modalidad                 | VARCHAR(50)   | NOT NULL, DEFAULT 'fin_de_semana'      | 'fin_de_semana' o 'liga'                             |
| dias_juego                | VARCHAR(100)  | NULLABLE                               | Días de juego para modo liga (ej: "miercoles,viernes")|

**Restricción de negocio:**
- Si `formato_categoria = 'categoria_fija'`: `categoria_id NOT NULL` y `suma_categoria IS NULL`
- Si `formato_categoria = 'suma'`: `suma_categoria NOT NULL` y `categoria_id IS NULL`

---

### 2.3 Tabla: `jugador`

| Columna           | Tipo          | Restricciones                          | Descripción                            |
|-------------------|---------------|----------------------------------------|----------------------------------------|
| id_jugador        | SERIAL        | PK                                     | Identificador único                    |
| nombre_jugador    | VARCHAR(100)  | NOT NULL                               | Nombre del jugador                     |
| apellido_jugador  | VARCHAR(100)  | NOT NULL                               | Apellido del jugador                   |
| apodo             | VARCHAR(50)   | NULLABLE                               | Apodo opcional (usado en nombre equipo)|
| email             | VARCHAR(100)  | UNIQUE, NOT NULL                       | Email y login del jugador              |
| telefono          | VARCHAR(20)   | NULLABLE                               | Teléfono de contacto                   |
| password          | VARCHAR(255)  | NOT NULL                               | Hash bcrypt(10) de la contraseña       |
| rol               | VARCHAR(20)   | NOT NULL, IN ('jugador','organizador') | Rol en el sistema                      |
| fecha_registro    | TIMESTAMP     | DEFAULT CURRENT_TIMESTAMP              | Fecha de alta en el sistema            |
| categoria_id      | INT           | FK → categoria, NULLABLE              | Categoría del jugador                  |
| foto_perfil       | TEXT          | NULLABLE                               | Path relativo a imagen de perfil       |

**Nota:** No existe campo `dni`. La autenticación usa `email` + `password`.

---

### 2.4 Tabla: `equipo`

| Columna       | Tipo         | Restricciones      | Descripción                                    |
|---------------|--------------|--------------------|------------------------------------------------|
| id_equipo     | SERIAL       | PK                 | Identificador único                            |
| jugador1_id   | INT          | FK → jugador       | Primer integrante de la pareja                 |
| jugador2_id   | INT          | FK → jugador       | Segundo integrante de la pareja                |
| nombre_equipo | VARCHAR(100) | NOT NULL           | Auto-generado: "Apellido1/Apellido2" o con apodo|

**Nota:** No almacena `id_torneo` ni `ranking`. La relación con torneos pasa por `inscripcion`.

---

### 2.5 Tabla: `inscripcion`

| Columna        | Tipo      | Restricciones                          | Descripción                   |
|----------------|-----------|----------------------------------------|-------------------------------|
| id_inscripcion | SERIAL    | PK                                     | Identificador único           |
| id_equipo      | INT       | FK → equipo, ON DELETE CASCADE         | Equipo inscripto              |
| id_torneo      | INT       | FK → torneo, ON DELETE CASCADE         | Torneo en que se inscribió    |
| created_at     | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP              | Fecha y hora de inscripción   |

**Validaciones en servidor (antes de insertar):**
1. Inscripción dentro del período abierto
2. Ningún jugador ya inscripto en el mismo torneo
3. Ningún jugador inscripto en otro torneo con fechas superpuestas
4. Categorías compatibles según `formato_categoria` del torneo

---

### 2.6 Tabla: `grupos`

| Columna   | Tipo        | Restricciones              | Descripción                            |
|-----------|-------------|----------------------------|-----------------------------------------|
| id_grupo  | SERIAL      | PK                         | Identificador único                    |
| id_torneo | INT         | FK → torneo, ON DELETE CASCADE | Torneo al que pertenece el grupo   |
| nombre    | VARCHAR(50) | NOT NULL                   | Nombre: "Grupo A", "Grupo B", "Liga Única" |

---

### 2.7 Tabla: `equipos_grupo`

| Columna          | Tipo | Restricciones                          | Descripción                         |
|------------------|------|----------------------------------------|--------------------------------------|
| id               | SERIAL | PK                                   | Identificador único                  |
| grupo_id         | INT  | FK → grupos, ON DELETE CASCADE         | Grupo al que pertenece               |
| equipo_id        | INT  | FK → equipo, ON DELETE CASCADE         | Equipo dentro del grupo              |
| puntos           | INT  | DEFAULT 0                              | Puntos acumulados (3=victoria, 0=derrota) |
| partidos_jugados | INT  | DEFAULT 0                              | Contador de partidos disputados      |
| sets_favor       | INT  | DEFAULT 0                              | Sets ganados                        |
| sets_contra      | INT  | DEFAULT 0                              | Sets perdidos                       |
| games_favor      | INT  | DEFAULT 0                              | Games ganados (desempate secundario) |
| games_contra     | INT  | DEFAULT 0                              | Games perdidos                      |

---

### 2.8 Tabla: `partidos_grupo`

| Columna       | Tipo        | Restricciones                                | Descripción                          |
|---------------|-------------|----------------------------------------------|---------------------------------------|
| id            | SERIAL      | PK                                           | Identificador único                   |
| grupo_id      | INT         | FK → grupos, ON DELETE CASCADE               | Grupo al que pertenece el partido     |
| equipo1_id    | INT         | FK → equipo, NOT NULL                        | Local / primer equipo                 |
| equipo2_id    | INT         | FK → equipo, NOT NULL                        | Visitante / segundo equipo            |
| set1_equipo1  | INT         | NULLABLE                                     | Games del equipo 1 en set 1           |
| set1_equipo2  | INT         | NULLABLE                                     | Games del equipo 2 en set 1           |
| set2_equipo1  | INT         | NULLABLE                                     | Games del equipo 1 en set 2           |
| set2_equipo2  | INT         | NULLABLE                                     | Games del equipo 2 en set 2           |
| set3_equipo1  | INT         | NULLABLE                                     | Games del equipo 1 en set 3 (si existe)|
| set3_equipo2  | INT         | NULLABLE                                     | Games del equipo 2 en set 3           |
| fecha         | TIMESTAMP   | NULLABLE                                     | Fecha asignada (modo liga)            |
| estado        | VARCHAR(20) | IN ('no_iniciado','iniciado','finalizado')   | Estado actual del partido             |

---

### 2.9 Tabla: `partidos_llave`

| Columna       | Tipo        | Restricciones                               | Descripción                                 |
|---------------|-------------|---------------------------------------------|----------------------------------------------|
| id            | SERIAL      | PK                                          | Identificador único                          |
| id_torneo     | INT         | FK → torneo, NOT NULL                       | Torneo al que pertenece                      |
| ronda         | VARCHAR(20) | NOT NULL                                    | 'OCTAVOS', 'CUARTOS', 'SEMIS', 'FINAL'      |
| orden         | INT         | NOT NULL                                    | Posición visual en el bracket (1, 2, ...)   |
| equipo1_id    | INT         | FK → equipo, NULLABLE                       | Primer equipo (puede llegar después)        |
| equipo2_id    | INT         | FK → equipo, NULLABLE                       | Segundo equipo                              |
| set1..set3    | INT x6      | NULLABLE                                    | Scores set a set (misma estructura que grupos)|
| estado        | VARCHAR(20) | IN ('no_iniciado','iniciado','finalizado')  | Estado actual                               |
| ganador_id    | INT         | FK → equipo, NULLABLE                       | Ganador del cruce (se calcula al finalizar) |
| next_match_id | INT         | NULLABLE                                    | ID del partido donde avanza el ganador      |
| next_slot     | INT         | NULLABLE (1 o 2)                            | Posición (equipo1 o equipo2) del siguiente  |
| created_at    | TIMESTAMP   | DEFAULT NOW()                               | Fecha de creación                           |
| updated_at    | TIMESTAMP   | DEFAULT NOW()                               | Última actualización                        |

---

### 2.10 Tabla: `ranking_jugador`

| Columna           | Tipo         | Restricciones                    | Descripción                                    |
|-------------------|--------------|----------------------------------|------------------------------------------------|
| id                | SERIAL       | PK                               | Identificador único                            |
| jugador_id        | INT          | FK → jugador, ON DELETE CASCADE  | Jugador al que corresponde                     |
| nombre            | VARCHAR(100) | NOT NULL                         | Nombre (desnormalizado para velocidad)         |
| apellido          | VARCHAR(100) | NOT NULL                         | Apellido                                       |
| ultima_pareja     | VARCHAR(150) | NULLABLE                         | Nombre del último equipo con quien jugó        |
| torneo_participado| VARCHAR(150) | NULLABLE                         | Nombre del último torneo disputado             |
| fase_llegada      | VARCHAR(50)  | NULLABLE                         | Última fase alcanzada (ej: "SEMIS", "FINAL")   |
| puntos            | INT          | NOT NULL, DEFAULT 0              | Puntos acumulados totales                      |
| categoria         | VARCHAR(50)  | NOT NULL                         | valor_numerico del jugador al momento del torneo|

**Sistema de puntos:**
- Campeón: 2000 pts | Subcampeón: 1200 | Semis: 720 | Cuartos: 360 | Octavos: 180

---

### 2.11 Tabla: `audit_log_ingresos`

| Columna    | Tipo        | Restricciones        | Descripción                              |
|------------|-------------|----------------------|-------------------------------------------|
| id         | SERIAL      | PK                   | Identificador único                       |
| jugador_id | INT         | NULLABLE             | ID del jugador (null si usuario inexistente)|
| nombre     | VARCHAR(100)| NULLABLE             | Nombre en el momento del intento         |
| apellido   | VARCHAR(100)| NULLABLE             | Apellido en el momento del intento       |
| ip         | VARCHAR(50) | NULLABLE             | IP de origen de la solicitud             |
| user_agent | TEXT        | NULLABLE             | Navegador/cliente usado                  |
| exitoso    | BOOLEAN     | DEFAULT FALSE        | true = login exitoso, false = fallido    |
| motivo     | TEXT        | NULLABLE             | Motivo del fallo (si exitoso = false)    |
| timestamp  | TIMESTAMP   | DEFAULT CURRENT_TIMESTAMP | Fecha y hora del intento            |

---

## 3. Fichas de Casos de Uso (actualizadas)

### CU01 — Registrar Jugador

| Campo              | Detalle                                                                 |
|--------------------|-------------------------------------------------------------------------|
| **Nombre**         | Registrar Jugador                                                       |
| **Actor**          | Usuario no registrado                                                   |
| **Precondición**   | El email no debe estar registrado previamente                           |
| **Flujo principal**| 1. Usuario completa: nombre, apellido, email, teléfono, contraseña (x2), categoría |
|                    | 2. Sistema valida que las contraseñas coincidan                         |
|                    | 3. Sistema valida que haya categoría seleccionada                       |
|                    | 4. Sistema aplica bcrypt(10) a la contraseña                           |
|                    | 5. Sistema inserta en `jugador` con rol='jugador'                       |
|                    | 6. Sistema devuelve datos del jugador creado (sin contraseña)           |
| **Flujos alternativos** | Email duplicado → error 400. Contraseñas distintas → error 400.  |
| **Postcondición**  | Nuevo registro en tabla `jugador`                                       |

**Nota sobre organizadores:** El registro de organizadores usa un endpoint separado (`/registro-organizadores`) protegido por `ADMIN_SECRET` configurado en variables de entorno. No está disponible en la interfaz pública.

---

### CU02 — Iniciar Sesión

| Campo              | Detalle                                                                 |
|--------------------|-------------------------------------------------------------------------|
| **Nombre**         | Iniciar Sesión                                                          |
| **Actor**          | Jugador u Organizador registrado                                        |
| **Precondición**   | Cuenta registrada en el sistema                                         |
| **Flujo principal**| 1. Usuario ingresa email y contraseña                                   |
|                    | 2. Sistema busca por email (insensible a mayúsculas)                    |
|                    | 3. Sistema valida contraseña con bcrypt.compare                         |
|                    | 4. Sistema registra el intento en `audit_log_ingresos`                 |
|                    | 5. Sistema devuelve JWT con expiración de 6 horas                      |
|                    | 6. Frontend almacena token y datos del usuario en localStorage          |
| **Flujos alternativos** | Email no encontrado → error 404. Contraseña incorrecta → error 401.|
| **Postcondición**  | Token JWT activo. Acceso habilitado a recursos protegidos.              |

---

### CU03 — Crear Torneo

| Campo              | Detalle                                                                    |
|--------------------|----------------------------------------------------------------------------|
| **Nombre**         | Crear Torneo                                                               |
| **Actor**          | Organizador (rol='organizador')                                            |
| **Precondición**   | Usuario autenticado con rol de organizador                                 |
| **Flujo principal**| 1. Organizador ingresa: nombre, fechas (inicio, fin, cierre), max equipos  |
|                    | 2. Selecciona **formato de categoría**: "Categoría Fija" o "Suma"         |
|                    | 3a. Si Categoría Fija: selecciona una categoría (2da a 8va)               |
|                    | 3b. Si Suma: ingresa el número objetivo (ej: 9 = 5ta+4ta)                 |
|                    | 4. Selecciona **modalidad**: "Fin de semana" o "Liga"                     |
|                    | 5. Si Liga: ingresa los días de juego (ej: "miercoles,viernes")           |
|                    | 6. Sistema valida combinación formato+categoría/suma                       |
|                    | 7. Sistema inserta en tabla `torneo`                                       |
| **Restricciones**  | categoria_fija requiere categoria_id; suma requiere suma_categoria         |
| **Postcondición**  | Nuevo torneo en estado "Inscripción abierta"                               |

---

### CU04 — Inscribir Equipo

| Campo              | Detalle                                                                    |
|--------------------|----------------------------------------------------------------------------|
| **Nombre**         | Inscribir Equipo                                                           |
| **Actor**          | Organizador (en nombre de los jugadores)                                   |
| **Precondición**   | Torneo en período de inscripción. Ambos jugadores registrados.             |
| **Flujo principal**| 1. Organizador selecciona torneo, jugador 1 y jugador 2                    |
|                    | 2. Sistema valida período de inscripción                                    |
|                    | 3. Sistema verifica que ninguno esté inscripto en este torneo              |
|                    | 4. Sistema verifica que no haya superposición de fechas con otros torneos  |
|                    | 5. Sistema valida categorías según formato del torneo:                      |
|                    |    - categoria_fija: ambos deben tener la misma categoría del torneo       |
|                    |    - suma: la suma de valor_numerico de ambos debe igualar suma_categoria  |
|                    | 6. Sistema crea `equipo` con nombre auto-generado (Apellido1/Apellido2)    |
|                    | 7. Sistema crea registro en `inscripcion`                                  |
| **Flujos alternativos** | Categorías incompatibles → error con detalle. Cupo lleno → error.   |
| **Postcondición**  | Equipo inscripto. Registro en `equipo` + `inscripcion`.                    |

---

### CU05 — Generar Grupos y Fixture

| Campo              | Detalle                                                                    |
|--------------------|----------------------------------------------------------------------------|
| **Nombre**         | Generar Grupos y Fixture                                                   |
| **Actor**          | Organizador                                                                |
| **Precondición**   | Torneo con al menos 2 equipos inscriptos. Grupos no generados aún.        |
| **Flujo principal — Modo Fin de Semana** |                                                    |
|                    | 1. Sistema asigna equipos aleatoriamente a grupos (3-5 equipos c/u)       |
|                    | 2. Sistema genera partidos round-robin dentro de cada grupo                |
|                    | 3. Crea registros en `grupos`, `equipos_grupo`, `partidos_grupo`           |
| **Flujo principal — Modo Liga** |                                                            |
|                    | 1. Sistema crea un único grupo "Liga Única"                                |
|                    | 2. Sistema genera fixture round-robin para TODOS los equipos               |
|                    | 3. Asigna fechas a cada jornada usando los días de juego configurados      |
|                    | 4. Actualiza `fecha_fin` del torneo según última jornada calculada         |
| **Postcondición**  | Partidos de grupos creados con fechas (liga) o sin fechas (fin de semana)  |

---

### CU06 — Cargar Resultado de Partido

| Campo              | Detalle                                                                    |
|--------------------|----------------------------------------------------------------------------|
| **Nombre**         | Cargar Resultado de Partido                                                |
| **Actor**          | Organizador                                                                |
| **Precondición**   | Partido en estado 'no_iniciado' o 'iniciado'. Grupos generados.            |
| **Flujo principal — Fase de Grupos** |                                                      |
|                    | 1. Organizador selecciona torneo → pestaña Grupos                          |
|                    | 2. Puede filtrar por nombre de equipo/jugador (barra de búsqueda)          |
|                    | 3. En modo liga: puede filtrar por fecha de jornada (desplegable)          |
|                    | 4. Selecciona partido y hace clic en "Cargar Resultado"                    |
|                    | 5. Ingresa el score de cada set: games equipo1 vs games equipo2            |
|                    | 6. Sistema calcula ganador de cada set, puntos (3=victoria, 0=derrota)    |
|                    | 7. Sistema actualiza `partidos_grupo` (estado='finalizado') y `equipos_grupo` |
|                    | 8. Si todos los partidos finalizan → sistema genera playoff automáticamente|
| **Flujo principal — Play-off** |                                                            |
|                    | 1. Organizador selecciona pestaña Play-off                                 |
|                    | 2. Ve el bracket organizado por rondas (CUARTOS, SEMIS, FINAL)             |
|                    | 3. Carga resultado del cruce (mismo mecanismo set a set)                   |
|                    | 4. Sistema determina ganador y lo pasa automáticamente al siguiente cruce  |
|                    | 5. Al completar la FINAL → sistema genera ranking del torneo               |
| **Postcondición**  | Resultado guardado. Estadísticas actualizadas. Ganador avanza en bracket.  |

**Nota importante:** El sistema NO usa un campo "ganador" seleccionado manualmente. El ganador se determina siempre contando sets ganados por el score ingresado.

---

### CU07 — Generar Play-off

| Campo              | Detalle                                                                    |
|--------------------|----------------------------------------------------------------------------|
| **Nombre**         | Generar Play-off                                                           |
| **Actor**          | Sistema (automático) u Organizador (manual)                                |
| **Precondición**   | Todos los partidos de fase de grupos finalizados.                          |
| **Flujo — 1 Grupo (Liga)** |                                                                   |
|                    | Si ≥ 8 equipos: 8 clasifican → CUARTOS + SEMIS + FINAL                    |
|                    | Si ≥ 4 equipos: 4 clasifican → SEMIS + FINAL                              |
|                    | Si < 4 equipos: 2 clasifican → FINAL directa                              |
| **Flujo — 2 Grupos** |                                                                        |
|                    | Top 2 de cada grupo (4 equipos) → SEMIS + FINAL                           |
| **Flujo — 3 Grupos** |                                                                        |
|                    | Top 2 de cada grupo (6 equipos) + los 2 mejores terceros = 8 equipos      |
|                    | → CUARTOS + SEMIS + FINAL                                                 |
| **Flujo — 4+ Grupos** |                                                                       |
|                    | Top 2 de cada grupo → SEMIS o CUARTOS según total (snake-seeding)         |
| **Seeding:**       | 1° vs 8°, 4° vs 5°, 2° vs 7°, 3° vs 6° (bracket estándar)               |
| **Postcondición**  | Registros en `partidos_llave` con `next_match_id` y `next_slot` enlazados |

---

### CU08 — Consultar Ranking

| Campo              | Detalle                                                                    |
|--------------------|----------------------------------------------------------------------------|
| **Nombre**         | Consultar Ranking                                                          |
| **Actor**          | Jugador (público, no requiere login)                                       |
| **Precondición**   | Al menos un torneo completado                                              |
| **Flujo principal**| 1. Usuario accede a la página de Ranking                                   |
|                    | 2. Puede filtrar por categoría (desplegable)                               |
|                    | 3. Sistema consulta `ranking_jugador` ordenado por puntos DESC             |
|                    | 4. Muestra: posición, jugador, última pareja, último torneo, fase, puntos  |
| **Postcondición**  | — (solo lectura)                                                           |

---

## 4. Arquitectura del Sistema

### Stack tecnológico

| Capa       | Tecnología            | Versión   |
|------------|-----------------------|-----------|
| Frontend   | React                 | 19.x      |
| Router SPA | React Router DOM      | 6.x       |
| Backend    | Node.js + Express     | 5.1.x     |
| Base datos | PostgreSQL            | 13        |
| ORM/Query  | node-postgres (pg)    | nativo SQL|
| Auth       | JWT + bcrypt          | 6h expiry, bcrypt(10) |
| Íconos     | lucide-react          | SVG       |
| Gráficos   | recharts              | —         |
| Deploy     | Docker Compose        | —         |

### Puertos (desarrollo local)

| Servicio    | Puerto |
|-------------|--------|
| Frontend    | 5173   |
| Backend API | 3000   |
| PostgreSQL  | 5432   |

### Endpoints API (resumen)

| Método | Ruta                                          | Descripción                          |
|--------|-----------------------------------------------|--------------------------------------|
| POST   | /api/registro                                 | Registro de jugador                  |
| POST   | /api/login                                    | Login → devuelve JWT                 |
| GET    | /api/jugadores                                | Listar jugadores                     |
| POST   | /api/jugadores                                | Crear jugador (organizador)          |
| PUT    | /api/jugadores/:id                            | Editar perfil (auth requerida)       |
| GET    | /api/torneos                                  | Listar torneos                       |
| POST   | /api/torneos                                  | Crear torneo                         |
| POST   | /api/inscripcion                              | Inscribir equipo                     |
| POST   | /api/torneos/:id/generar-grupos               | Generar fase de grupos               |
| GET    | /api/torneos/:id/grupos                       | Ver grupos y partidos                |
| PUT    | /api/partidos-grupo/:id                       | Cargar resultado de grupo            |
| GET    | /api/torneos/:id/playoff                      | Ver bracket playoff                  |
| POST   | /api/torneos/:id/playoff                      | Generar playoff manualmente          |
| PUT    | /api/torneos/:id/playoff/partidos/:id         | Cargar resultado playoff             |
| GET    | /api/ranking                                  | Consultar ranking global             |
| GET    | /api/dashboard/kpis                           | KPIs para organizador                |
| GET    | /api/categorias                               | Listar categorías                    |

---

## 5. Funcionalidades Pendientes (futuras sprints)

| Funcionalidad    | Estado       | Notas                                            |
|------------------|--------------|--------------------------------------------------|
| Transmisión live | No iniciado  | Figuraba en DER anterior, no implementado        |
| Multimedia       | No iniciado  | Figuraba en DER anterior, no implementado        |
| Notificaciones   | No iniciado  | —                                               |
| App móvil        | No iniciado  | —                                               |

---

*Documento generado: 22 de Junio de 2026*
*Basado en revisión del código fuente real del repositorio*
