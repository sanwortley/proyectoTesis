// middlewares/rbac.js
const PERMISSIONS = {
  organizador: ['torneos.crear', 'playoff.generar', 'resultados.cargar'],
  jugador:     ['inscripcion.crear'],
  invitado:    []
};

export function requirePerm(perm) {
  return (req, res, next) => {
    const role = req.user?.role || 'invitado';
    if (PERMISSIONS[role]?.includes(perm)) return next();
    return res.status(403).json({ error: 'Acceso denegado: no tenés permisos' });
  };
}
