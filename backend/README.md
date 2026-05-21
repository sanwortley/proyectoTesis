# Backend

Este backend usa PostgreSQL y requiere que la base de datos tenga las columnas usadas por los endpoints de torneos, grupos y fixtures.

## Parche de esquema

Si obtienes errores como `column t.modalidad does not exist` o `column t.dias_juego does not exist`, ejecuta:

```bash
cd backend
npm run db:patch
```

Esto aplica el SQL en `backend/DATA/patch_schema.sql` y crea las columnas necesarias en la base de datos existente.

## Migraciones

También hay un archivo de migración adicional en `backend/migrations/migration_fix_schema.sql` con los mismos cambios.
