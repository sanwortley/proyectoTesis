// src/pages/Inscripcion.js
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import '../style.css';

function Inscripcion() {
  const navigate = useNavigate();
  const { jugador } = useAuth();

  const [torneos, setTorneos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [jugadoresDisponibles, setJugadoresDisponibles] = useState([]);

  const [jugador2Id, setJugador2Id] = useState('');
  const [torneoId, setTorneoId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCompaneros, setLoadingCompaneros] = useState(false);

  useEffect(() => {
    if (!jugador?.token) navigate('/login', { replace: true });
  }, [jugador?.token, navigate]);

  // Carga torneos abiertos y categorías al montar
  useEffect(() => {
    (async () => {
      try {
        const [resTor, resCat] = await Promise.all([
          api.get('/torneos'),
          api.get('/categorias'),
        ]);
        const hoy = new Date();
        const abiertos = (resTor.data || []).filter(
          t => new Date(t.fecha_cierre_inscripcion) >= hoy
        );
        setTorneos(abiertos);
        setCategorias(resCat.data || []);
      } catch (e) {
        console.error('Error cargando datos:', e);
      }
    })();
  }, []);

  // Cuando cambia el torneo, carga compañeros disponibles para ese torneo
  useEffect(() => {
    setJugador2Id('');
    setMensaje('');
    setError('');

    if (!torneoId) { setJugadoresDisponibles([]); return; }

    setLoadingCompaneros(true);
    api.get(`/torneos/${torneoId}/jugadores-disponibles`)
      .then(res => {
        // Excluir al jugador logueado de la lista de compañeros
        const sin_mi = (res.data || []).filter(
          j => String(j.id_jugador) !== String(jugador?.id)
        );
        setJugadoresDisponibles(sin_mi);
      })
      .catch(() => setJugadoresDisponibles([]))
      .finally(() => setLoadingCompaneros(false));
  }, [torneoId, jugador?.id]);

  // ── Helpers ──────────────────────────────────────────────
  const getCategoriaValor = useCallback((idCat) => {
    const cat = categorias.find(c => String(c.id_categoria) === String(idCat));
    return cat?.valor_numerico ?? null;
  }, [categorias]);

  const getCategoriaNombre = useCallback((idCat) => {
    const cat = categorias.find(c => String(c.id_categoria) === String(idCat));
    return cat?.nombre ?? `Cat. ${idCat}`;
  }, [categorias]);

  // ── Torneo seleccionado ───────────────────────────────────
  const torneo = useMemo(() =>
    torneos.find(t => String(t.id_torneo) === String(torneoId)) || null,
    [torneos, torneoId]
  );

  const esSuma = torneo?.formato_categoria === 'suma';
  const sumaObjetivo = esSuma ? Number(torneo.suma_categoria) : null;
  const cuposMax = torneo ? (torneo.max_parejas ?? torneo.max_equipos ?? null) : null;
  const cuposLibres = cuposMax != null ? cuposMax - (torneo.inscriptos_count ?? 0) : null;

  // Valor numérico del jugador logueado (viene directo del login)
  const miValorNumerico = jugador?.valor_numerico ?? getCategoriaValor(jugador?.categoria_id);

  const complementoNecesario = esSuma && miValorNumerico != null
    ? sumaObjetivo - miValorNumerico
    : null;

  // ── Filtrado de compañeros ────────────────────────────────
  const companerosFiltrados = useMemo(() => {
    if (!torneo) return [];
    if (esSuma) {
      if (miValorNumerico == null) return jugadoresDisponibles; // sin info de cat: mostrar todos
      return jugadoresDisponibles.filter(j => Number(j.valor_numerico) === complementoNecesario);
    }
    // categoria_fija: mismo categoria_id que el torneo
    return jugadoresDisponibles.filter(
      j => String(j.categoria_id) === String(torneo.categoria_id)
    );
  }, [jugadoresDisponibles, torneo, esSuma, miValorNumerico, complementoNecesario]);

  const nombreJugador = (j) => {
    const cat = j.categoria_nombre || getCategoriaNombre(j.categoria_id);
    const apodo = j.apodo ? ` (${j.apodo})` : '';
    return `${j.nombre_jugador} ${j.apellido_jugador}${apodo} — ${cat}`;
  };

  const nombreCompleto = useMemo(() => {
    const n = jugador?.nombre?.trim() || '';
    const a = jugador?.apellido?.trim() || '';
    return `${n} ${a}`.trim() || '—';
  }, [jugador]);

  const labelTorneo = (t) => {
    const max = t.max_parejas ?? t.max_equipos;
    const inscriptos = t.inscriptos_count ?? 0;
    const lleno = max != null && inscriptos >= max;
    const cupos = max != null ? `${inscriptos}/${max}` : '';
    const tipo = t.formato_categoria === 'suma'
      ? `SUMA ${t.suma_categoria}`
      : getCategoriaNombre(t.categoria_id);
    const cierre = new Date(t.fecha_cierre_inscripcion).toLocaleDateString('es-AR');
    return `${lleno ? 'LLENO — ' : ''}${t.nombre_torneo} — ${tipo}${cupos ? ` [${cupos}]` : ''} | Cierra: ${cierre}`;
  };

  const torneoEstaLleno = (t) => {
    const max = t.max_parejas ?? t.max_equipos;
    return max != null && (t.inscriptos_count ?? 0) >= max;
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje(''); setError('');
    setLoading(true);
    try {
      await api.post('/inscripcion', {
        jugador1_id: jugador.id,
        jugador2_id: jugador2Id,
        id_torneo: torneoId,
      });
      setMensaje('¡Inscripción exitosa!');
      setJugador2Id(''); setTorneoId('');
      setTimeout(() => navigate('/home-jugador', { replace: true }), 1400);
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al inscribirse.');
    } finally {
      setLoading(false);
    }
  };

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
    <form onSubmit={handleSubmit} className="inscripcion-form">
      <h2 className="inscripcion-titulo">Inscribite al Torneo</h2>

      {mensaje && <p className="success">{mensaje}</p>}
      {error   && <p className="error">{error}</p>}

      {/* Jugador principal (fijo) */}
      <label className="inscripcion-label">Jugador principal:</label>
      <input
        className="inscripcion-input"
        value={`${nombreCompleto} — ${getCategoriaNombre(jugador?.categoria_id)}`}
        disabled
      />

      {/* Torneo */}
      <label className="inscripcion-label">Torneo:</label>
      <select
        className="inscripcion-select"
        value={torneoId}
        onChange={e => setTorneoId(e.target.value)}
        required
      >
        <option value="">Seleccioná torneo</option>
        {torneos.map(t => (
          <option key={t.id_torneo} value={t.id_torneo} disabled={torneoEstaLleno(t)}>
            {labelTorneo(t)}
          </option>
        ))}
      </select>

      {/* Info cupos + SUMA hint */}
      {torneo && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '6px 0 4px' }}>
          {cuposLibres != null && (
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
              background: cuposLibres === 0 ? 'rgba(220,53,69,0.18)' : cuposLibres <= 2 ? 'rgba(255,193,7,0.18)' : 'rgba(40,167,69,0.18)',
              color: cuposLibres === 0 ? '#dc3545' : cuposLibres <= 2 ? '#ffc107' : '#28a745',
              border: `1px solid ${cuposLibres === 0 ? '#dc354555' : cuposLibres <= 2 ? '#ffc10755' : '#28a74555'}`,
            }}>
              {cuposLibres === 0 ? 'Sin cupos' : `${cuposLibres} cupo${cuposLibres !== 1 ? 's' : ''} disponible${cuposLibres !== 1 ? 's' : ''}`}
            </span>
          )}
          {esSuma && (
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
              background: 'rgba(130,90,255,0.15)', color: '#a47dff', border: '1px solid #a47dff55',
            }}>
              SUMA {sumaObjetivo} — necesitás un compañero de cat. {complementoNecesario}
            </span>
          )}
        </div>
      )}

      {/* Compañero */}
      <label className="inscripcion-label">Compañero:</label>
      <select
        className="inscripcion-select"
        value={jugador2Id}
        onChange={e => setJugador2Id(e.target.value)}
        required
        disabled={!torneoId || loadingCompaneros || cuposLibres === 0}
      >
        <option value="">
          {!torneoId
            ? 'Primero elegí un torneo'
            : loadingCompaneros
              ? 'Cargando...'
              : cuposLibres === 0
                ? 'Torneo lleno'
                : esSuma
                  ? `— Jugadores de cat. ${complementoNecesario} —`
                  : 'Seleccioná compañero'}
        </option>
        {companerosFiltrados.map(j => (
          <option key={j.id_jugador} value={j.id_jugador}>
            {nombreJugador(j)}
          </option>
        ))}
      </select>

      {torneo && companerosFiltrados.length === 0 && !loadingCompaneros && (
        <p className="error" style={{ fontSize: '0.85rem', marginTop: 4 }}>
          {esSuma
            ? `No hay jugadores disponibles de categoría ${complementoNecesario} para este torneo.`
            : 'No hay compañeros disponibles de tu categoría para este torneo.'}
        </p>
      )}

      <button
        className="inscripcion-boton"
        type="submit"
        disabled={loading || !jugador2Id || !torneoId || cuposLibres === 0}
      >
        {loading ? 'Inscribiendo...' : 'Inscribirse'}
      </button>
    </form>
  );
}

export default Inscripcion;
