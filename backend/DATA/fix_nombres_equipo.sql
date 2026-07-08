-- Fix: reemplaza nombres de equipo generados como "DibuMartinez/La ArañaAlvarez"
-- Lógica: apodo si tiene, sino apellido (más único que nombre)
-- Solo afecta equipos con '/' en el nombre (los creados por script con futbolistas)

UPDATE equipo e
SET nombre_equipo =
  COALESCE(NULLIF(j1.apodo, ''), j1.apellido_jugador)
  || ' / ' ||
  COALESCE(NULLIF(j2.apodo, ''), j2.apellido_jugador)
FROM jugador j1, jugador j2
WHERE j1.id_jugador = e.jugador1_id
  AND j2.id_jugador = e.jugador2_id
  AND e.nombre_equipo LIKE '%/%';
