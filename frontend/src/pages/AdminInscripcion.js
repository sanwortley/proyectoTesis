import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import '../admin.css';
import '../style.css';

export default function AdminInscripcion() {
  const [torneos, setTorneos] = useState([]);
  const [jugadoresDisponibles, setJugadoresDisponibles] = useState([]);

  const [jugador1Id, setJugador1Id] = useState('');
  const [jugador2Id, setJugador2Id] = useState('');
  const [torneoId, setTorneoId] = useState('');

  const [modalExito, setModalExito] = useState(null); // { nombreEquipo, nombreTorneo }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingJugadores, setLoadingJugadores] = useState(false);

  useEffect(() => {
    axios.get('/api/torneos')
      .then(res => setTorneos(res.data || []))
      .catch(() => setTorneos([]));
  }, []);

  // Al cambiar torneo, recarga jugadores disponibles
  useEffect(() => {
    setJugador1Id('');
    setJugador2Id('');
    setError('');

    if (!torneoId) { setJugadoresDisponibles([]); return; }

    setLoadingJugadores(true);
    axios.get(`/api/torneos/${torneoId}/jugadores-disponibles`)
      .then(res => setJugadoresDisponibles(res.data || []))
      .catch(() => setJugadoresDisponibles([]))
      .finally(() => setLoadingJugadores(false));
  }, [torneoId]);

  // ── Torneo seleccionado ──────────────────────────────────
  const torneo = torneos.find(t => String(t.id_torneo) === torneoId) || null;
  const esSuma = torneo?.formato_categoria === 'suma';
  const sumaObjetivo = esSuma ? Number(torneo.suma_categoria) : null;
  const categoriaFijaId = !esSuma ? torneo?.categoria_id : null;
  const cuposMax = torneo ? (torneo.max_parejas ?? torneo.max_equipos ?? null) : null;
  const cuposLibres = cuposMax != null ? cuposMax - (torneo.inscriptos_count ?? 0) : null;

  // ── Jugador 1 seleccionado ───────────────────────────────
  const j1 = jugadoresDisponibles.find(j => String(j.id_jugador) === jugador1Id) || null;

  // ── Filtrado de opciones ─────────────────────────────────
  const filtrarJ1 = (j) => {
    if (esSuma) {
      // Para SUMA: mostrar todos los disponibles con valor_numerico válido
      return j.valor_numerico != null;
    }
    // categoria_fija: solo jugadores de esa categoría
    return categoriaFijaId == null || String(j.categoria_id) === String(categoriaFijaId);
  };

  const filtrarJ2 = (j) => {
    if (String(j.id_jugador) === jugador1Id) return false;
    if (esSuma) {
      if (!j1) return j.valor_numerico != null; // antes de elegir J1: todos
      // J1 elegido: solo el complemento exacto
      return Number(j.valor_numerico) === sumaObjetivo - Number(j1.valor_numerico);
    }
    return categoriaFijaId == null || String(j.categoria_id) === String(categoriaFijaId);
  };

  const opcionesJ1 = jugadoresDisponibles.filter(filtrarJ1);
  const opcionesJ2 = jugadoresDisponibles.filter(filtrarJ2);

  const placeholderJ2 = () => {
    if (!torneoId) return '← Seleccioná un torneo primero';
    if (loadingJugadores) return 'Cargando...';
    if (esSuma && j1) return `— Jugadores con cat. ${sumaObjetivo - j1.valor_numerico} —`;
    return '— Seleccioná jugador 2 —';
  };

  const nombreJugador = (j) => {
    const cat = j.categoria_nombre || (j.categoria_id ? `Cat. ${j.categoria_id}` : '');
    const apodo = j.apodo ? ` (${j.apodo})` : '';
    return `${j.nombre_jugador} ${j.apellido_jugador}${apodo}${cat ? ` — ${cat}` : ''}`;
  };

  const labelTorneo = (t) => {
    const max = t.max_parejas ?? t.max_equipos;
    const inscriptos = t.inscriptos_count ?? 0;
    const cupos = max != null ? `${inscriptos}/${max} cupos` : '';
    return `${t.nombre_torneo}${cupos ? `  [${cupos}]` : ''}`;
  };

  const torneoLleno = (t) => {
    const max = t.max_parejas ?? t.max_equipos;
    return max != null && (t.inscriptos_count ?? 0) >= max;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!jugador1Id || !jugador2Id || !torneoId) {
      setError('Seleccioná ambos jugadores y el torneo.'); return;
    }
    if (jugador1Id === jugador2Id) {
      setError('Los dos jugadores deben ser distintos.'); return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/inscripcion', {
        jugador1_id: Number(jugador1Id),
        jugador2_id: Number(jugador2Id),
        id_torneo: Number(torneoId),
      });
      const nombreTorneo = torneo?.nombre_torneo || '';
      setModalExito({ nombreEquipo: res.data.nombre_equipo, nombreTorneo });
      setJugador1Id(''); setJugador2Id(''); setTorneoId('');
      setTorneos(prev => prev.map(t =>
        String(t.id_torneo) === torneoId
          ? { ...t, inscriptos_count: (t.inscriptos_count ?? 0) + 1 }
          : t
      ));
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo inscribir el equipo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Inscribir Equipo</h1>
      </div>

      <form onSubmit={handleSubmit} className="inscripcion-admin-form">

        {/* Torneo */}
        <div className="form-group">
          <label className="form-label">Torneo</label>
          <select
            className="modal-input"
            value={torneoId}
            onChange={e => { setTorneoId(e.target.value); setError(''); }}
          >
            <option value="">— Seleccioná torneo —</option>
            {torneos.map(t => (
              <option key={t.id_torneo} value={t.id_torneo} disabled={torneoLleno(t)}>
                {labelTorneo(t)}{torneoLleno(t) ? ' — LLENO' : ''}
              </option>
            ))}
          </select>
          {torneo && cuposLibres != null && (
            <span className={`cupos-badge ${cuposLibres === 0 ? 'cupos-lleno' : cuposLibres <= 2 ? 'cupos-poco' : 'cupos-ok'}`}>
              {cuposLibres === 0
                ? 'Sin cupos'
                : `${cuposLibres} cupo${cuposLibres !== 1 ? 's' : ''} disponible${cuposLibres !== 1 ? 's' : ''}`}
            </span>
          )}
          {esSuma && (
            <span className="cupos-badge" style={{ marginLeft: 6, background: 'rgba(130,90,255,0.15)', color: '#a47dff', border: '1px solid #a47dff55' }}>
              SUMA {sumaObjetivo}
            </span>
          )}
        </div>

        {/* Jugador 1 */}
        <div className="form-group">
          <label className="form-label">Jugador 1</label>
          <select
            className="modal-input"
            value={jugador1Id}
            onChange={e => { setJugador1Id(e.target.value); setJugador2Id(''); setError(''); }}
            disabled={!torneoId || loadingJugadores}
          >
            <option value="">
              {!torneoId ? '← Seleccioná un torneo primero' : loadingJugadores ? 'Cargando...' : '— Seleccioná jugador 1 —'}
            </option>
            {opcionesJ1.map(j => (
              <option key={j.id_jugador} value={j.id_jugador}>{nombreJugador(j)}</option>
            ))}
          </select>
          {esSuma && j1 && (
            <span className="cupos-badge" style={{ background: 'rgba(130,90,255,0.15)', color: '#a47dff', border: '1px solid #a47dff55' }}>
              Cat. {j1.valor_numerico} — necesita complemento {sumaObjetivo - j1.valor_numerico}
            </span>
          )}
        </div>

        {/* Jugador 2 */}
        <div className="form-group">
          <label className="form-label">Jugador 2</label>
          <select
            className="modal-input"
            value={jugador2Id}
            onChange={e => { setJugador2Id(e.target.value); setError(''); }}
            disabled={!torneoId || loadingJugadores}
          >
            <option value="">{placeholderJ2()}</option>
            {opcionesJ2.map(j => (
              <option key={j.id_jugador} value={j.id_jugador}>{nombreJugador(j)}</option>
            ))}
          </select>
        </div>

        {/* Aviso cuando no hay jugadores de la categoría requerida */}
        {torneoId && !loadingJugadores && opcionesJ1.length === 0 && (
          <p className="error" style={{ fontSize: '0.85rem', marginTop: 4 }}>
            {esSuma
              ? 'No hay jugadores disponibles para armar pares en este torneo.'
              : `No quedan jugadores disponibles${torneo ? ` de ${torneo.categoria_nombre || 'esa categoría'}` : ''} — todos ya están inscriptos.`}
          </p>
        )}

        {error && <p className="error">{error}</p>}

        <button
          type="submit"
          className="btn-save"
          disabled={loading || !torneoId || !jugador1Id || !jugador2Id || cuposLibres === 0}
          style={{ marginTop: 12, padding: '14px', width: '100%', fontSize: '1rem', borderRadius: 12, cursor: 'pointer', border: 'none', fontWeight: 800 }}
        >
          {loading ? 'Inscribiendo...' : 'Inscribir equipo'}
        </button>
      </form>

      {/* Modal de éxito */}
      {modalExito && ReactDOM.createPortal(
        <div className="inscripcion-modal-overlay" onClick={() => setModalExito(null)}>
          <div className="inscripcion-modal-box" onClick={e => e.stopPropagation()}>
            <div className="inscripcion-modal-check">✓</div>
            <h2 className="inscripcion-modal-titulo">¡Inscripción exitosa!</h2>
            <p className="inscripcion-modal-equipo">{modalExito.nombreEquipo}</p>
            <p className="inscripcion-modal-torneo">{modalExito.nombreTorneo}</p>
            <button className="inscripcion-modal-btn" onClick={() => setModalExito(null)}>
              Aceptar
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
