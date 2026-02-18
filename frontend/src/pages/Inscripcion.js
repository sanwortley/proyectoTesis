// src/pages/Inscripcion.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios'; // instancia con baseURL '/api'
import '../style.css';

function Inscripcion() {
  const navigate = useNavigate();
  const { jugador } = useAuth(); // { id, nombre, apellido, email, role/rol, token, categoria_id? }

  const [jugadores, setJugadores] = useState([]);
  const [torneos, setTorneos] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [jugador2Id, setJugador2Id] = useState('');
  const [torneoId, setTorneoId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [torneoLleno, setTorneoLleno] = useState(false);
  const [jugador1Inscripto, setJugador1Inscripto] = useState(false);
  const [jugador2Inscripto, setJugador2Inscripto] = useState(false);
  const [jugador1InscriptoNombre, setJugador1InscriptoNombre] = useState('');
  const [jugador2InscriptoNombre, setJugador2InscriptoNombre] = useState('');

  // 🚧 Si no hay token, mandá a login (evita entrar sin sesión)
  useEffect(() => {
    if (!jugador?.token) navigate('/login', { replace: true });
  }, [jugador?.token, navigate]);

  // Cargar listas: jugadores, torneos y categorías
  useEffect(() => {
    (async () => {
      try {
        const [resJug, resTor, resCat] = await Promise.all([
          api.get('/jugadores'),
          api.get('/torneos'),
          api.get('/categorias'),
        ]);

        setJugadores(resJug.data || []);

        const hoy = new Date();
        const torneosAbiertos = (resTor.data || []).filter(
          (t) => new Date(t.fecha_cierre_inscripcion) >= hoy
        );
        setTorneos(torneosAbiertos);

        setCategorias(resCat.data || []);
      } catch (e) {
        console.error('Error cargando listas:', e);
      }
    })();
  }, []);

  // Helper: nombre de categoría por id
  const getCategoriaNombre = (idCat) => {
    if (!idCat) return '';
    const cat = categorias.find((c) => String(c.id_categoria) === String(idCat));
    return cat ? cat.nombre : `Cat ${idCat}`;
  };

  // Helper: valor numérico de categoría por id (2..8)
  const getCategoriaValor = useCallback(
    (idCat) => {
      if (!idCat) return null;
      const cat = categorias.find(
        (c) => String(c.id_categoria) === String(idCat)
      );
      return cat?.valor_numerico ?? null;
    },
    [categorias]
  );

  // Verificaciones dinámicas (cupo + ya inscriptos)
  useEffect(() => {
    (async () => {
      if (!torneoId || !jugador?.id || !jugador2Id) return;
      try {
        const resInscripcion = await api.post('/verificar-inscripcion', {
          jugador1_id: jugador.id,
          jugador2_id: jugador2Id,
          id_torneo: torneoId,
        });

        setJugador1Inscripto(!!resInscripcion.data?.jugador1Inscripto);
        setJugador2Inscripto(!!resInscripcion.data?.jugador2Inscripto);
        setJugador1InscriptoNombre(resInscripcion.data?.jugador1Nombre || '');
        setJugador2InscriptoNombre(resInscripcion.data?.jugador2Nombre || '');

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

  // Torneo seleccionado (para saber su categoría)
  const torneoSeleccionado = useMemo(() => {
    return torneos.find((t) => String(t.id_torneo) === String(torneoId)) || null;
  }, [torneos, torneoId]);

  // Limpia compañero cuando cambias de torneo (evita que quede uno inválido)
  useEffect(() => {
    setJugador2Id('');
    setJugador2Inscripto(false);
    setJugador1Inscripto(false);
    setJugador1InscriptoNombre('');
    setJugador2InscriptoNombre('');
    setTorneoLleno(false);
    // ojo: esto solo resetea estados visuales; las verificaciones vuelven a correr cuando selecciones compañero
  }, [torneoId]);

  // Jugadores disponibles según el torneo
  const jugadoresDisponibles = useMemo(() => {
    // base: solo jugadores reales, sin incluirme a mi
    const base = jugadores.filter(
      (j) =>
        String(j.id_jugador) !== String(jugador?.id) &&
        j.rol?.toLowerCase?.() === 'jugador'
    );

    // si todavía no eligió torneo, no muestres a nadie
    if (!torneoSeleccionado) return [];

    // Caso A: torneo por categoría fija
    if (torneoSeleccionado.formato_categoria !== 'suma') {
      const idCatTorneo = torneoSeleccionado.categoria_id;
      return base.filter(
        (j) => String(j.categoria_id) === String(idCatTorneo)
      );
    }

    // Caso B: torneo por "SUMA X"
    const sumaObjetivo = Number(torneoSeleccionado.suma_categoria);

    // el jugador logueado tiene que tener categoria_id
    const catValorJugador1 = getCategoriaValor(jugador?.categoria_id);

    if (!catValorJugador1 || !sumaObjetivo) return [];

    return base.filter((j) => {
      const catValorJ2 = getCategoriaValor(j.categoria_id);
      if (!catValorJ2) return false;

      // ✅ regla: suma exacta
      return catValorJugador1 + catValorJ2 === sumaObjetivo;
    });
  }, [
    jugadores,
    jugador?.id,
    jugador?.categoria_id,
    torneoSeleccionado,
    getCategoriaValor,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    setLoading(true);

    try {
      await api.post('/inscripcion', {
        jugador1_id: jugador.id,
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

  // Guard “no logueado”
  if (!jugador?.token) {
    return (
      <div className="no-logueado-container">
        <h2>No estás logueado</h2>
        <p>Por favor, iniciá sesión para poder inscribirte en un torneo.</p>
        <Link to="/login" className="volver-login-boton">
          Ir al login
        </Link>
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
        {jugador1Inscripto && (
          <p className="error">
            {jugador1InscriptoNombre || 'Vos'} ya está inscripto en este torneo.
          </p>
        )}
        {jugador2Inscripto && (
          <p className="error">
            {jugador2InscriptoNombre || 'El compañero seleccionado'} ya está inscripto en este torneo.
          </p>
        )}

        {/* SUMA X: hint de categoría necesaria */}
        {torneoSeleccionado?.formato_categoria === 'suma' && (
          <div style={{
            background: '#1a1a2e',
            border: '1px solid #ffd700',
            borderRadius: '8px',
            padding: '12px 16px',
            margin: '8px 0 16px',
            fontSize: '14px',
            color: '#e0e0e0'
          }}>
            <strong style={{ color: '#ffd700' }}>Torneo SUMA {torneoSeleccionado.suma_categoria}</strong>
            <br />
            Tu categoría: <strong>{getCategoriaNombre(jugador?.categoria_id)}</strong>
            {(() => {
              const miValor = getCategoriaValor(jugador?.categoria_id);
              const objetivo = Number(torneoSeleccionado.suma_categoria);
              if (miValor && objetivo) {
                const necesita = objetivo - miValor;
                return (
                  <>
                    <br />
                    Necesitás un compañero de <strong>{necesita}ta Categoría</strong> para sumar {objetivo}.
                  </>
                );
              }
              return null;
            })()}
            {jugadoresDisponibles.length > 0 && (
              <>
                <br />
                <span style={{ color: '#98fb98' }}>
                  ✓ {jugadoresDisponibles.length} jugador{jugadoresDisponibles.length > 1 ? 'es' : ''} disponible{jugadoresDisponibles.length > 1 ? 's' : ''}
                </span>
              </>
            )}
            {jugadoresDisponibles.length === 0 && torneoSeleccionado && (
              <>
                <br />
                <span style={{ color: '#ff6b6b' }}>
                  ✗ No hay jugadores disponibles de esa categoría
                </span>
              </>
            )}
          </div>
        )}

        <label className="inscripcion-label">Jugador principal:</label>
        <input className="inscripcion-input" value={nombreCompleto} disabled />

        <label className="inscripcion-label">Torneo:</label>
        <select
          className="inscripcion-select"
          value={torneoId}
          onChange={(e) => setTorneoId(e.target.value)}
          required
        >
          <option value="">Seleccioná torneo</option>
          {torneos.map((t) => {
            const estaLleno = t.max_equipos && t.inscriptos_count >= t.max_equipos;
            return (
              <option key={t.id_torneo} value={t.id_torneo} disabled={estaLleno}>
                {estaLleno ? 'LLENO — ' : ''}
                {t.nombre_torneo} —{' '}
                {t.formato_categoria === 'suma'
                  ? `SUMA ${t.suma_categoria}`
                  : getCategoriaNombre(t.categoria_id)}
                {'  |  Cierra: ' +
                  new Date(t.fecha_cierre_inscripcion).toLocaleDateString()}
                {estaLleno ? ` (${t.inscriptos_count}/${t.max_equipos})` : ''}
              </option>
            );
          })}
        </select>

        <label className="inscripcion-label">Compañero:</label>
        <select
          className="inscripcion-select"
          value={jugador2Id}
          onChange={(e) => setJugador2Id(e.target.value)}
          required
          disabled={!torneoId}
        >
          <option value="">
            {torneoId ? 'Seleccioná compañero' : 'Primero elegí un torneo'}
          </option>

          {jugadoresDisponibles.map((j) => (
            <option key={j.id_jugador} value={j.id_jugador}>
              {j.nombre_jugador} {j.apellido_jugador}
            </option>
          ))}
        </select>

        <button
          className="inscripcion-boton"
          type="submit"
          disabled={
            loading || jugador1Inscripto || jugador2Inscripto || torneoLleno
          }
        >
          {loading ? 'Inscribiendo...' : 'Inscribirse'}
        </button>
      </form>
    </>
  );
}

export default Inscripcion;
