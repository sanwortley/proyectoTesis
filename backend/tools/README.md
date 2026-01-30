# Herramientas de Mantenimiento

Este directorio contiene scripts útiles para el mantenimiento, limpieza y prueba de la base de datos.
Estos scripts están diseñados para ejecutarse **dentro del contenedor Docker** del backend, ya que utilizan las variables de entorno configuradas en `docker-compose`.

## Scripts Disponibles

### 1. `reset_db.js`
**Uso:** Elimina datos de prueba o reinicia la base de datos a un estado limpio.
**Comando:**
```bash
docker exec node-backend node tools/reset_db.js
```
*Nota: Este script está configurado para borrar torneos de prueba específicos o limpiar tablas según se configure.*

### 2. `seed_db.js`
**Uso:** Puebla la base de datos con datos realistas (Jugadores, Categorías, Torneos iniciales). ideal para entornos de desarrollo.
**Comando:**
```bash
docker exec node-backend node tools/seed_db.js
```

### 3. `check_tables.js`
**Uso:** Lista todas las tablas de la base de datos para verificar que la estructura es correcta.
**Comando:**
```bash
docker exec node-backend node tools/check_tables.js
```
