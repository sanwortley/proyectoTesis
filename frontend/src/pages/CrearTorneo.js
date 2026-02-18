import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import '../crearTorneo.css';
/* import { useLocation } from 'react-router-dom'; */

function CrearTorneo() {
  const [nombre_torneo, setNombreTorneo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [fecha_cierre_inscripcion, setFechaCierreInscripcion] = useState('');
  const [max_equipos, setMaxEquipos] = useState('');
  const [idCategoria, setIdCategoria] = useState('');

  const [formatoCategoria, setFormatoCategoria] = useState('categoria_fija');
  const [sumaCategoria, setSumaCategoria] = useState('');

  const [modalidad, setModalidad] = useState('fin_de_semana'); // nuevo
  const [diasJuego, setDiasJuego] = useState('');              // nuevo

  const [categorias, setCategorias] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  /* const [mostrarTorneos, setMostrarTorneos] = useState(false); // Eliminado por no uso */
  const [torneos, setTorneos] = useState([]);
  const [torneosFinalizados, setTorneosFinalizados] = useState([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [equiposPorTorneo, setEquiposPorTorneo] = useState({});
  const [torneosExpandido, setTorneosExpandido] = useState({});
  const [editando, setEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({});
  const [mensajeGrupos, setMensajeGrupos] = useState('');
  const [torneoConGrupos, setTorneoConGrupos] = useState(null);

  /* const location = useLocation(); // Eliminado por no uso */

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API_URL}/categorias`)
      .then((res) => setCategorias(res.data))
      .catch(() => setError('Error al cargar categorías'));

    // Cargar torneos al inicio
    obtenerTorneos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    // Validaciones básicas según formato
    if (formatoCategoria === 'categoria_fija' && !idCategoria) {
      setError('Seleccioná una categoría para el torneo');
      return;
    }
    if (formatoCategoria === 'suma' && !sumaCategoria) {
      setError('Indicá el valor de SUMA para el torneo');
      return;
    }
    // Validar dias de juego si es liga
    if (modalidad === 'liga' && !diasJuego.trim()) {
      setError('Indicá los días de juego para la Liga');
      return;
    }

    try {
      // 👇 YA NO PEDIMOS /torneos/nuevo-id, lo genera la DB
      await axios.post(`${process.env.REACT_APP_API_URL}/torneos`, {
        nombre_torneo,
        fecha_inicio: fechaInicio,
        fecha_fin: modalidad === 'liga' ? null : fechaFin,
        fecha_cierre_inscripcion,
        max_equipos: parseInt(max_equipos, 10),
        formato_categoria: formatoCategoria,
        categoria_id:
          formatoCategoria === 'categoria_fija'
            ? parseInt(idCategoria, 10) || null
            : null,
        suma_categoria:
          formatoCategoria === 'suma'
            ? parseInt(sumaCategoria, 10) || null
            : null,
        modalidad,
        dias_juego: modalidad === 'liga' ? diasJuego : null
      });

      setMensaje('Torneo creado con éxito');
      setNombreTorneo('');
      setFechaInicio('');
      setFechaFin('');
      setFechaCierreInscripcion('');
      setMaxEquipos('');
      setIdCategoria('');
      setFormatoCategoria('categoria_fija');
      setSumaCategoria('');
      setModalidad('fin_de_semana');
      setDiasJuego('');

      obtenerTorneos();
    } catch (err) {
      console.error(err?.response?.data || err);
      setError(err?.response?.data?.error || 'Error al crear torneo');
    }
  };

  useEffect(() => {
    if (mensajeGrupos) {
      const timer = setTimeout(() => {
        setMensajeGrupos('');
        setTorneoConGrupos(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [mensajeGrupos]);

  const obtenerTorneos = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/torneos`);
      const todos = res.data;
      const hoy = new Date();

      const torneosPorCategoria = {};

      // ahora usamos categoria_id
      todos.forEach((t) => {
        const inicio = new Date(t.fecha_inicio);
        const claveCat = t.categoria_id ?? 'sin_categoria';
        if (
          !torneosPorCategoria[claveCat] ||
          inicio > new Date(torneosPorCategoria[claveCat].fecha_inicio)
        ) {
          torneosPorCategoria[claveCat] = t;
        }
      });

      const torneosValidos = todos.filter((t) => {
        const fin = new Date(t.fecha_fin);
        if (fin < hoy) return false; // finalizados van aparte
        const inicio = new Date(t.fecha_inicio);
        const diffDias = (hoy - inicio) / (1000 * 60 * 60 * 24);
        const esReciente = diffDias <= 7;
        const claveCat = t.categoria_id ?? 'sin_categoria';
        const masReciente =
          torneosPorCategoria[claveCat]?.id_torneo === t.id_torneo;
        return esReciente || masReciente;
      });

      // Torneos finalizados (fecha_fin < hoy)
      const finalizados = todos
        .filter((t) => t.fecha_fin && new Date(t.fecha_fin) < hoy)
        .sort((a, b) => new Date(b.fecha_fin) - new Date(a.fecha_fin));

      setTorneos(torneosValidos);
      setTorneosFinalizados(finalizados);
    } catch (err) {
      console.error('Error al obtener todos los torneos', err);
    }
  };

  const obtenerEquipos = async (id_torneo) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/torneos/${id_torneo}/equipos`
      );
      setEquiposPorTorneo((prev) => ({
        ...prev,
        [id_torneo]: res.data.equipos,
      }));
    } catch (err) {
      console.error('Error al obtener equipos del torneo');
    }
  };

  const eliminarEquipo = async (id_equipo) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/equipos/${id_equipo}`
      );
      alert('Equipo eliminado');
      obtenerTorneos();
    } catch (err) {
      console.error('Error al eliminar equipo');
    }
  };

  const eliminarTorneo = async (id_torneo) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/torneos/${id_torneo}`
      );
      alert('Torneo eliminado');
      obtenerTorneos();
    } catch (err) {
      console.error('Error al eliminar torneo');
    }
  };

  const editarTorneo = async () => {
    try {
      const payload = {
        nombre_torneo: formEdit.nombre_torneo,
        fecha_inicio: formEdit.fecha_inicio,
        fecha_fin: formEdit.fecha_fin,
        fecha_cierre_inscripcion: formEdit.fecha_cierre_inscripcion,
        max_equipos: parseInt(formEdit.max_equipos, 10),
        formato_categoria: formEdit.formato_categoria || 'categoria_fija',
        categoria_id:
          (formEdit.formato_categoria || 'categoria_fija') ===
            'categoria_fija'
            ? parseInt(formEdit.categoria_id, 10) || null
            : null,
        suma_categoria:
          formEdit.formato_categoria === 'suma'
            ? parseInt(formEdit.suma_categoria, 10) || null
            : null,
        modalidad: formEdit.modalidad,
        dias_juego: formEdit.modalidad === 'liga' ? formEdit.dias_juego : null
      };

      await axios.put(
        `${process.env.REACT_APP_API_URL}/torneos/${editando.id_torneo}`,
        payload
      );
      setEditando(null);
      setFormEdit({});
      obtenerTorneos();
    } catch (err) {
      console.error('Error al editar torneo', err);
    }
  };

  const toggleExpandir = (id) => {
    setTorneosExpandido((prev) => {
      const nuevoEstado = { ...prev, [id]: !prev[id] };
      if (nuevoEstado[id] && !equiposPorTorneo[id]) {
        obtenerEquipos(id);
      }
      return nuevoEstado;
    });
  };

  const generarGrupos = async (idTorneo) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/torneos/${idTorneo}/generar-grupos`,
        { method: 'POST' }
      );

      setTorneoConGrupos(idTorneo);
      if (res.ok) {
        setMensajeGrupos('Grupos generados correctamente');
        obtenerTorneos();
      } else {
        setMensajeGrupos('Error al generar grupos');
      }
    } catch (err) {
      console.error('Error generando grupos:', err);
      setMensajeGrupos('Ocurrió un error inesperado');
    }
  };

  const getCategoriaNombre = (catId) => {
    if (!catId) return 'Sin categoría';
    const cat = categorias.find((c) => c.id_categoria === catId);
    return cat ? cat.nombre : `Categoría ${catId}`;
  };

  const abrirEdicion = (t) => {
    setEditando(t);
    const toDateInput = (val) => {
      if (!val) return '';
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return val;
      return d.toISOString().slice(0, 10);
    };

    setFormEdit({
      id_torneo: t.id_torneo,
      nombre_torneo: t.nombre_torneo,
      fecha_inicio: toDateInput(t.fecha_inicio),
      fecha_fin: toDateInput(t.fecha_fin),
      fecha_cierre_inscripcion: toDateInput(t.fecha_cierre_inscripcion),
      max_equipos: t.max_equipos,
      formato_categoria: t.formato_categoria || 'categoria_fija',
      categoria_id: t.categoria_id || '',
      suma_categoria: t.suma_categoria || '',
      modalidad: t.modalidad || 'fin_de_semana', // nuevo
      dias_juego: t.dias_juego || ''             // nuevo
    });
  };

  return (
    <>
      <div className="contenedor-crear-torneo">
        {/* FORMULARIO */}
        <div className="formulario-lado">
          <form onSubmit={handleSubmit} className="crear-torneo-form">
            <h2>Crear Torneo</h2>

            {mensaje && <p className="success">{mensaje}</p>}
            {error && <p className="error">{error}</p>}

            <input
              type="text"
              value={nombre_torneo}
              placeholder="Nombre del torneo"
              onChange={(e) => setNombreTorneo(e.target.value)}
              required
            />

            <label>Fecha de inicio del torneo</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
            />

            {modalidad !== 'liga' && (
              <>
                <label>Fecha de finalización del torneo</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  required={modalidad !== 'liga'}
                />
              </>
            )}

            <label>Fecha de cierre de inscripción</label>
            <input
              type="date"
              value={fecha_cierre_inscripcion}
              onChange={(e) => setFechaCierreInscripcion(e.target.value)}
              required
            />

            <input
              type="number"
              placeholder="Máx equipos"
              value={max_equipos}
              onChange={(e) => setMaxEquipos(e.target.value)}
              required
            />

            {/* Modalidad: Fin de semana o Liga */}
            <label>Modalidad</label>
            <select
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value)}
            >
              <option value="fin_de_semana">Fin de Semana (Viernes/Sábado/Domingo)</option>
              <option value="liga">Liga / Fechas (Días específicos)</option>
            </select>

            {modalidad === 'liga' && (
              <div className="dias-juego-selector">
                <label>Días de Juego:</label>
                <div className="checkboxes-dias">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => (
                    <label key={dia} style={{ display: 'inline-block', marginRight: '10px' }}>
                      <input
                        type="checkbox"
                        value={dia}
                        checked={diasJuego.includes(dia)}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (diasJuego.includes(val)) {
                            setDiasJuego(prev => prev.split(',').filter(d => d !== val).join(','));
                          } else {
                            setDiasJuego(prev => prev ? prev + ',' + val : val);
                          }
                        }}
                      />
                      {dia}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Formato: categoría fija o SUMA */}
            <label>Formato del torneo</label>
            <select
              value={formatoCategoria}
              onChange={(e) => setFormatoCategoria(e.target.value)}
            >
              <option value="categoria_fija">Por categoría fija</option>
              <option value="suma">SUMA X</option>
            </select>

            {formatoCategoria === 'categoria_fija' && (
              <select
                value={idCategoria}
                onChange={(e) => setIdCategoria(e.target.value)}
                required={formatoCategoria === 'categoria_fija'}
              >
                <option value="">Seleccioná una categoría</option>
                {categorias.map((cat) => (
                  <option key={cat.id_categoria} value={cat.id_categoria}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            )}

            {formatoCategoria === 'suma' && (
              <input
                type="number"
                min="2"
                placeholder="SUMA (ej: 9)"
                value={sumaCategoria}
                onChange={(e) => setSumaCategoria(e.target.value)}
                required={formatoCategoria === 'suma'}
              />
            )}

            <button type="submit">Crear Torneo</button>
          </form>

          {/* HISTORIAL DE TORNEOS FINALIZADOS (BLOQUE SEPARADO) */}
          {torneosFinalizados.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setMostrarHistorial(!mostrarHistorial)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'transparent',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  color: '#bdc3c7',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  width: '100%',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  backgroundColor: '#0a0a0a',
                  border: '1px solid #333',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#ffd700';
                  e.currentTarget.style.color = '#ffd700';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#333';
                  e.currentTarget.style.color = '#bdc3c7';
                }}
              >
                {/* Clock history icon (SVG) */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                  <path d="M2.05 12A10 10 0 0 1 6 4.46" />
                  <path d="M5 1L2.05 4.46L6 4.46" />
                </svg>
                {mostrarHistorial ? 'Ocultar historial' : `Historial de torneos (${torneosFinalizados.length})`}
              </button>

              {mostrarHistorial && (
                <div style={{ marginTop: '16px', opacity: 0.8 }}>
                  {torneosFinalizados.map((t) => (
                    <div key={t.id_torneo} className="torneo-card" style={{ borderColor: '#555', position: 'relative', marginBottom: '12px', background: '#0a0a0a' }}>
                      <span style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: '#bdc3c7',
                        color: '#000',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>Finalizado</span>
                      <h3 style={{ color: '#bdc3c7', fontSize: '1.2rem' }}>{t.nombre_torneo}</h3>
                      <p style={{ fontSize: '0.9rem' }}><strong>Inicio:</strong> {new Date(t.fecha_inicio).toLocaleDateString()}</p>
                      <p style={{ fontSize: '0.9rem' }}><strong>Fin:</strong> {new Date(t.fecha_fin).toLocaleDateString()}</p>
                      <p style={{ fontSize: '0.9rem' }}>
                        <strong>Formato:</strong>{' '}
                        {t.formato_categoria === 'suma'
                          ? `SUMA ${t.suma_categoria}`
                          : getCategoriaNombre(t.categoria_id)}
                      </p>
                      <p style={{ fontSize: '0.9rem' }}><strong>Máx equipos:</strong> {t.max_equipos}</p>
                      <div style={{ marginTop: '12px' }}>
                        <button
                          type="button"
                          onClick={() => toggleExpandir(t.id_torneo)}
                          style={{
                            padding: '8px 16px',
                            fontSize: '0.85rem',
                            background: '#ffd700',
                            color: '#000',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          {torneosExpandido[t.id_torneo] ? 'Ocultar equipos' : 'Ver equipos'}
                        </button>
                      </div>
                      {torneosExpandido[t.id_torneo] && (
                        <ul className="equipo-lista" style={{ marginTop: '15px' }}>
                          {Array.isArray(equiposPorTorneo[t.id_torneo]) &&
                            equiposPorTorneo[t.id_torneo].length > 0 ? (
                            equiposPorTorneo[t.id_torneo].map((e) => (
                              <li key={e.id_equipo} style={{ padding: '10px', marginBottom: '8px', border: '1px solid #333', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.9rem' }}>{e.nombre_equipo}</span>
                                <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '10px', fontStyle: 'italic' }}>
                                  ({e.nombre_jugador1} {e.apellido_jugador1} / {e.nombre_jugador2} {e.apellido_jugador2})
                                </span>
                              </li>
                            ))
                          ) : (
                            <li style={{ fontSize: '0.9rem', color: '#888' }}>No hay equipos inscriptos.</li>
                          )}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* TORNEOS */}
        {/* TORNEOS */}
        <div className="torneos-lado">
          <div className="torneo-grid">
            {torneos.map((t) => (
              <div key={t.id_torneo} className="torneo-card">
                <h3>{t.nombre_torneo}</h3>
                <p>
                  <strong>Inicio:</strong>{' '}
                  {new Date(t.fecha_inicio).toLocaleDateString()}
                </p>
                <p>
                  <strong>Fin:</strong>{' '}
                  {new Date(t.fecha_fin).toLocaleDateString()}
                </p>
                <p>
                  <strong>Cierre inscripción:</strong>{' '}
                  {new Date(
                    t.fecha_cierre_inscripcion
                  ).toLocaleDateString()}
                </p>
                <p>
                  <strong>Máx equipos:</strong> {t.max_equipos}
                </p>

                <div style={{ marginBottom: '10px' }}>
                  {t.modalidad === 'liga' ? (
                    <span className="badge-modality badge-liga">LIGA</span>
                  ) : (
                    <span className="badge-modality badge-weekend">FIN DE SEMANA</span>
                  )}
                </div>

                {t.modalidad === 'liga' && (
                  <p>
                    <strong>Días:</strong> {t.dias_juego}
                  </p>
                )}

                <p>
                  <strong>Formato:</strong>{' '}
                  {t.formato_categoria === 'suma'
                    ? `SUMA ${t.suma_categoria}`
                    : getCategoriaNombre(t.categoria_id)}
                </p>

                <div className="torneo-botones">
                  <button onClick={() => toggleExpandir(t.id_torneo)}>
                    {torneosExpandido[t.id_torneo]
                      ? 'Ocultar equipos'
                      : 'Ver equipos'}
                  </button>
                  <button
                    onClick={() => abrirEdicion(t)}
                    className="btn-warning"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarTorneo(t.id_torneo)}
                    className="btn-danger"
                  >
                    Eliminar Torneo
                  </button>
                  <button
                    onClick={() => generarGrupos(t.id_torneo)}
                    className="btn-generar"
                  >
                    Generar Grupos
                  </button>
                </div>

                {torneosExpandido[t.id_torneo] && (
                  <ul className="equipo-lista">
                    {Array.isArray(equiposPorTorneo[t.id_torneo]) &&
                      equiposPorTorneo[t.id_torneo].length > 0 ? (
                      equiposPorTorneo[t.id_torneo].map((e) => (
                        <li key={e.id_equipo}>
                          <span>{e.nombre_equipo}</span>
                          <span className="equipo-detalle">
                            {e.nombre_jugador1} {e.apellido_jugador1} /{' '}
                            {e.nombre_jugador2} {e.apellido_jugador2}
                          </span>
                          <button
                            onClick={() => eliminarEquipo(e.id_equipo)}
                            className="btn-warning"
                          >
                            Eliminar equipo
                          </button>
                        </li>
                      ))
                    ) : (
                      <li>No hay equipos aún.</li>
                    )}
                  </ul>
                )}

                {torneoConGrupos === t.id_torneo && mensajeGrupos && (
                  <p className="success">{mensajeGrupos}</p>
                )}
              </div>
            ))}
          </div>
        </div>

      </div> {/* CIERRE DE contenedor-crear-torneo */}

      {/* MODAL DE EDICIÓN (FUERA PARA EVITAR CONFLICTOS DE POSICIONAMIENTO) */}
      {editando && ReactDOM.createPortal(
        <div className="editar-form-modal">
          <div className="modal-content">
            <h3>Editar Torneo</h3>
            <div className="modal-scroll-area">
              <div className="form-group">
                <label>Nombre del Torneo</label>
                <input
                  type="text"
                  value={formEdit.nombre_torneo || ''}
                  onChange={(e) =>
                    setFormEdit({ ...formEdit, nombre_torneo: e.target.value })
                  }
                  placeholder="Nombre del torneo"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Fecha de Inicio</label>
                  <input
                    type="date"
                    value={formEdit.fecha_inicio || ''}
                    onChange={(e) =>
                      setFormEdit({ ...formEdit, fecha_inicio: e.target.value })
                    }
                  />
                </div>
                {formEdit.modalidad !== 'liga' && (
                  <div className="form-group">
                    <label>Fecha de Fin</label>
                    <input
                      type="date"
                      value={formEdit.fecha_fin || ''}
                      onChange={(e) =>
                        setFormEdit({ ...formEdit, fecha_fin: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Cierre de Inscripción</label>
                <input
                  type="date"
                  value={formEdit.fecha_cierre_inscripcion || ''}
                  onChange={(e) =>
                    setFormEdit({
                      ...formEdit,
                      fecha_cierre_inscripcion: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Máx Equipos</label>
                  <input
                    type="number"
                    value={formEdit.max_equipos || ''}
                    onChange={(e) =>
                      setFormEdit({ ...formEdit, max_equipos: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Modalidad</label>
                  <select
                    value={formEdit.modalidad || 'fin_de_semana'}
                    onChange={(e) =>
                      setFormEdit({ ...formEdit, modalidad: e.target.value })
                    }
                  >
                    <option value="fin_de_semana">Fin de Semana</option>
                    <option value="liga">Liga / Fechas</option>
                  </select>
                </div>
              </div>

              {formEdit.modalidad === 'liga' && (
                <div className="form-group">
                  <label>Días de Juego</label>
                  <div className="checkboxes-dias edit-modal-days">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => (
                      <label key={dia} className="checkbox-label">
                        <input
                          type="checkbox"
                          value={dia}
                          checked={(formEdit.dias_juego || '').includes(dia)}
                          onChange={(e) => {
                            const val = e.target.value;
                            const actuales = formEdit.dias_juego || '';
                            let nuevos;
                            if (actuales.includes(val)) {
                              nuevos = actuales.split(',').filter(d => d !== val).join(',');
                            } else {
                              nuevos = actuales ? actuales + ',' + val : val;
                            }
                            setFormEdit({ ...formEdit, dias_juego: nuevos });
                          }}
                        />
                        {dia}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Formato Categoría</label>
                  <select
                    value={formEdit.formato_categoria || 'categoria_fija'}
                    onChange={(e) =>
                      setFormEdit({ ...formEdit, formato_categoria: e.target.value })
                    }
                  >
                    <option value="categoria_fija">Por categoría fija</option>
                    <option value="suma">SUMA X</option>
                  </select>
                </div>
                <div className="form-group">
                  {formEdit.formato_categoria !== 'suma' ? (
                    <>
                      <label>Categoría</label>
                      <select
                        value={formEdit.categoria_id || ''}
                        onChange={(e) =>
                          setFormEdit({ ...formEdit, categoria_id: e.target.value })
                        }
                      >
                        <option value="">Seleccioná</option>
                        {categorias.map((cat) => (
                          <option key={cat.id_categoria} value={cat.id_categoria}>
                            {cat.nombre}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <label>Valor SUMA</label>
                      <input
                        type="number"
                        min="2"
                        value={formEdit.suma_categoria || ''}
                        onChange={(e) =>
                          setFormEdit({ ...formEdit, suma_categoria: e.target.value })
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-save" onClick={editarTorneo}>Guardar Cambios</button>
              <button className="btn-cancel" onClick={() => setEditando(null)}>Cancelar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default CrearTorneo;
