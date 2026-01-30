import { useState, useEffect } from 'react';
import axios from 'axios';
import '../crearTorneo.css';
import { useLocation } from 'react-router-dom';

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
  const [mostrarTorneos, setMostrarTorneos] = useState(false);
  const [torneos, setTorneos] = useState([]);
  const [equiposPorTorneo, setEquiposPorTorneo] = useState({});
  const [torneosExpandido, setTorneosExpandido] = useState({});
  const [editando, setEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({});
  const [mensajeGrupos, setMensajeGrupos] = useState('');
  const [torneoConGrupos, setTorneoConGrupos] = useState(null);

  const location = useLocation();

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
        nombre_torneo,
        fecha_inicio: fechaInicio,
        fecha_fin: modalidad === 'liga' ? null : fechaFin,
        fecha_cierre_inscripcion,
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
        const inicio = new Date(t.fecha_inicio);
        const diffDias = (hoy - inicio) / (1000 * 60 * 60 * 24);
        const esReciente = diffDias <= 7;
        const claveCat = t.categoria_id ?? 'sin_categoria';
        const masReciente =
          torneosPorCategoria[claveCat]?.id_torneo === t.id_torneo;
        return esReciente || masReciente;
      });

      setTorneos(torneosValidos);
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
      </div>

      {/* MODAL DE EDICIÓN */}
      {editando && (
        <div className="editar-form-modal">
          <h3>Editar Torneo</h3>
          <input
            type="text"
            value={formEdit.nombre_torneo || ''}
            onChange={(e) =>
              setFormEdit({ ...formEdit, nombre_torneo: e.target.value })
            }
            placeholder="Nombre del torneo"
          />
          <input
            type="date"
            value={formEdit.fecha_inicio || ''}
            onChange={(e) =>
              setFormEdit({ ...formEdit, fecha_inicio: e.target.value })
            }
          />
          <input
            type="date"
            value={formEdit.fecha_fin || ''}
            onChange={(e) =>
              setFormEdit({ ...formEdit, fecha_fin: e.target.value })
            }
          />
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
          <input
            type="number"
            value={formEdit.max_equipos || ''}
            onChange={(e) =>
              setFormEdit({ ...formEdit, max_equipos: e.target.value })
            }
            placeholder="Máx equipos"
          />

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

          {formEdit.modalidad === 'liga' && (
            <input
              type="text"
              placeholder="Días de juego"
              value={formEdit.dias_juego || ''}
              onChange={(e) =>
                setFormEdit({ ...formEdit, dias_juego: e.target.value })
              }
            />
          )}

          <label>Formato del torneo</label>
          <select
            value={formEdit.formato_categoria || 'categoria_fija'}
            onChange={(e) =>
              setFormEdit({ ...formEdit, formato_categoria: e.target.value })
            }
          >
            <option value="categoria_fija">Por categoría fija</option>
            <option value="suma">SUMA X</option>
          </select>

          {formEdit.formato_categoria !== 'suma' && (
            <select
              value={formEdit.categoria_id || ''}
              onChange={(e) =>
                setFormEdit({ ...formEdit, categoria_id: e.target.value })
              }
            >
              <option value="">Seleccioná una categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          )}

          {formEdit.formato_categoria === 'suma' && (
            <input
              type="number"
              min="2"
              value={formEdit.suma_categoria || ''}
              onChange={(e) =>
                setFormEdit({ ...formEdit, suma_categoria: e.target.value })
              }
              placeholder="SUMA (ej: 9)"
            />
          )}

          <button onClick={editarTorneo}>Guardar Cambios</button>
          <button onClick={() => setEditando(null)}>Cancelar</button>
        </div>
      )}
    </>
  );
}

export default CrearTorneo;
