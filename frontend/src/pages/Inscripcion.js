// src/pages/Inscripcion.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios'; // <= usa la instancia con baseURL '/api'
import '../style.css';

function Inscripcion() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const { jugador } = useAuth(); // { id, nombre, apellido, email, role, token }

  const [jugadores, setJugadores] = useState([]);
  const [torneos, setTorneos] = useState([]);
  const [jugador2Id, setJugador2Id] = useState('');
  const [torneoId, setTorneoId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [torneoLleno, setTorneoLleno] = useState(false);
  const [jugador1Inscripto, setJugador1Inscripto] = useState(false);
  const [jugador2Inscripto, setJugador2Inscripto] = useState(false);

  // 🚧 Si no hay token, mandá a login (evita entrar sin sesión)
  useEffect(() => {
    if (!jugador?.token) navigate('/login', { replace: true });
  }, [jugador?.token, navigate]);

  // Cargar listas
  useEffect(() => {
    (async () => {
      try {
        const [resJug, resTor] = await Promise.all([
          api.get('/jugadores'),
          api.get('/torneos'),
        ]);

        setJugadores(resJug.data || []);

        const hoy = new Date();
        const torneosAbiertos = (resTor.data || []).filter(
          (t) => new Date(t.fecha_cierre_inscripcion) >= hoy
        );
        setTorneos(torneosAbiertos);
      } catch (e) {
        console.error('Error cargando listas:', e);
      }
    })();
  }, []);

  // Verificaciones dinámicas (cupo + ya inscriptos)
  useEffect(() => {
    (async () => {
      if (!torneoId || !jugador?.id || !jugador2Id) return;
      try {
        const resInscripcion = await api.post('/verificar-inscripcion', {
          jugador1_id: jugador.id,   // 👈 ID REAL DEL CONTEXTO
          jugador2_id: jugador2Id,
          id_torneo: torneoId,
        });

        setJugador1Inscripto(!!resInscripcion.data?.jugador1Inscripto);
        setJugador2Inscripto(!!resInscripcion.data?.jugador2Inscripto);

        const resCupo = await api.get(`/torneos/${torneoId}/verificar-cupo`);
        setTorneoLleno(!!resCupo.data?.lleno);
      } catch (err) {
        console.error('Error al verificar inscripción o cupo:', err);
      }
    })();
  }, [jugador?.id, jugador2Id, torneoId]);

  // Nombre completo del principal desde contexto
  const nombreCompleto = useMemo(() => {
    const n = jugador?.nombre?.trim() || '';
    const a = jugador?.apellido?.trim() || '';
    return `${n} ${a}`.trim() || '—';
  }, [jugador]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    setLoading(true);

    try {
      await api.post('/inscripcion', {
        jugador1_id: jugador.id,  // 👈 ID REAL
        jugador2_id: jugador2Id,
        id_torneo: torneoId,
      });

      setMensaje('Inscripción exitosa');
      setJugador2Id('');
      setTorneoId('');
      setTimeout(() => navigate('/home-jugador', { replace: true }), 1200);
    } catch (err) {
      console.error('Error al inscribirse:', err?.response?.data || err.message);
      setError(err?.response?.data?.error || 'Error al inscribirse');
    } finally {
      setLoading(false);
    }
  };

  // Guard “no logueado” (si por algún motivo se llega sin token)
  if (!jugador?.token) {
    return (
      <div className="no-logueado-container">
        <h2>No estás logueado</h2>
        <p>Por favor, iniciá sesión para poder inscribirte en un torneo.</p>
        <Link to="/login" className="volver-login-boton">Ir al login</Link>
      </div>
    );
  }

  return (
    <>
      

      <form onSubmit={handleSubmit} className="inscripcion-form">
        <h2 className="inscripcion-titulo">Inscribite al Torneo</h2>

        {mensaje && <p className="success">{mensaje}</p>}
        {error && <p className="error">{error}</p>}
        {torneoLleno && <p className="error">Este torneo ya está lleno.</p>}
        {jugador1Inscripto && <p className="error">Ya estás inscripto en este torneo.</p>}
        {jugador2Inscripto && <p className="error">El jugador seleccionado como compañero ya está inscripto en este torneo.</p>}

        <label className="inscripcion-label">Jugador principal:</label>
        <input className="inscripcion-input" value={nombreCompleto} disabled />

        <label className="inscripcion-label">Compañero:</label>
        <select
          className="inscripcion-select"
          value={jugador2Id}
          onChange={(e) => setJugador2Id(e.target.value)}
          required
        >
          <option value="">Seleccioná compañero</option>
          {jugadores
            .filter(j =>
              // excluye al propio jugador (tu lista viene con id_jugador)
              j.id_jugador !== jugador.id &&
              (j.rol?.toLowerCase?.() === 'jugador')
            )
            .map(j => (
              <option key={j.id_jugador} value={j.id_jugador}>
                {j.nombre_jugador} {j.apellido_jugador}
              </option>
            ))}
        </select>

        <label className="inscripcion-label">Torneo:</label>
        <select
          className="inscripcion-select"
          value={torneoId}
          onChange={(e) => setTorneoId(e.target.value)}
          required
        >
          <option value="">Seleccioná torneo</option>
          {torneos.map(t => (
            <option key={t.id_torneo} value={t.id_torneo}>
              {t.nombre_torneo} (Cierra: {new Date(t.fecha_cierre_inscripcion).toLocaleDateString()})
            </option>
          ))}
        </select>

        <button
          className="inscripcion-boton"
          type="submit"
          disabled={loading || jugador1Inscripto || jugador2Inscripto || torneoLleno}
        >
          {loading ? 'Inscribiendo...' : 'Inscribirse'}
        </button>
      </form>
    </>
  );
}

export default Inscripcion;
