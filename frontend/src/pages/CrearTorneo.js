import { useState, useEffect } from 'react';
import axios from 'axios';
import logo from '../assets/logo.png'; 
import { Link } from 'react-router-dom';
import '../style.css';
import { useLocation } from 'react-router-dom';


function CrearTorneo() {
  const [nombre_torneo, setNombreTorneo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [fecha_cierre_inscripcion, setFechaCierreInscripcion] = useState('');
  const [max_equipos, setMaxEquipos] = useState('');
  const [idCategoria, setIdCategoria] = useState('');
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

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/categorias`)
      .then(res => setCategorias(res.data))
      .catch(() => setError('Error al cargar categorías'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      const idResp = await axios.get(`${process.env.REACT_APP_API_URL}/torneos/nuevo-id`);
      const id_torneo = idResp.data.id_torneo;

      await axios.post(`${process.env.REACT_APP_API_URL}/torneos`, {
        id_torneo,
        nombre_torneo,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        fecha_cierre_inscripcion,
        max_equipos: parseInt(max_equipos),
        categoria: parseInt(idCategoria),
      });

      setMensaje('Torneo creado con éxito');
      setNombreTorneo('');
      setFechaInicio('');
      setFechaFin('');
      setFechaCierreInscripcion('');
      setMaxEquipos('');
      setIdCategoria('');
    } catch (err) {
      setError('Error al crear torneo');
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
      setTorneos(res.data);
    } catch (err) {
      console.error('Error al obtener torneos');
    }
  };

  const obtenerEquipos = async (id_torneo) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/torneos/${id_torneo}/equipos`);
      setEquiposPorTorneo(prev => ({
        ...prev,
        [id_torneo]: res.data.equipos
      }));
    } catch (err) {
      console.error('Error al obtener equipos del torneo');
    }
  };

  const eliminarEquipo = async (id_equipo) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/equipos/${id_equipo}`);
      alert('Equipo eliminado');
      obtenerTorneos();
    } catch (err) {
      console.error('Error al eliminar equipo');
    }
  };

  const eliminarTorneo = async (id_torneo) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/torneos/${id_torneo}`);
      alert('Torneo eliminado');
      obtenerTorneos();
    } catch (err) {
      console.error('Error al eliminar torneo');
    }
  };

  const editarTorneo = async () => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/torneos/${editando.id_torneo}`, {
        ...formEdit,
        categoria: parseInt(formEdit.categoria) // Convertir a número
      });
      setEditando(null);
      setFormEdit({});
      obtenerTorneos();
    } catch (err) {
      console.error('Error al editar torneo', err);
    }
  };
  

  const toggleExpandir = (id) => {
    setTorneosExpandido(prev => {
      const nuevoEstado = { ...prev, [id]: !prev[id] };
      if (nuevoEstado[id] && !equiposPorTorneo[id]) {
        obtenerEquipos(id);
      }
      return nuevoEstado;
    });
  };
  const generarGrupos = async (idTorneo) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/torneos/${idTorneo}/generar-grupos`, {
        method: 'POST'
      });
  
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
  
  

  return (
    <>
      <nav className="navbar">
          <div className="navbar-logo-container">
            <Link to="/home-organizador">
            <img src={logo} alt="Logo" className="navbar-logo" />
            </Link>
          </div>

              <div className="navbar-links">
                <Link to="/crear-torneo" className={isActive('/crear-torneo') ? 'active-link' : ''}>
                    Crear Torneo
                </Link>
                <Link to="/ranking">Ranking</Link>
                <Link to="/subir-multimedia">Multimedia</Link>
                <Link to="/cargar-resultado">Resultados</Link>
                <Link to="/cargar-transmision">Transmisión</Link>
              </div>
            </nav>
  
      <div className="contenedor-crear-torneo">
        {/* FORMULARIO */}
        <div className="formulario-lado">
          <form onSubmit={handleSubmit} className="crear-torneo-form">
            <h2>Crear Torneo</h2>
  
            {mensaje && <p className="success">{mensaje}</p>}
            {error && <p className="error">{error}</p>}
  
            <input type="text" value={nombre_torneo} placeholder="Nombre del torneo" onChange={(e) => setNombreTorneo(e.target.value)} required />
            <label>Fecha de inicio del torneo</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required />
            <label>Fecha de finalización del torneo</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} required />
            <label>Fecha de cierre de inscripción</label>
            <input type="date" value={fecha_cierre_inscripcion} onChange={(e) => setFechaCierreInscripcion(e.target.value)} required />
            <input type="number" placeholder="Máx equipos" value={max_equipos} onChange={(e) => setMaxEquipos(e.target.value)} required />
  
            <select value={idCategoria} onChange={(e) => setIdCategoria(e.target.value)} required>
              <option value="">Seleccioná una categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>{cat.nombre}</option>
              ))}
            </select>
  
            <button type="submit">Crear Torneo</button>
          </form>
        </div>
  
        {/* TORNEOS */}
        <div className="torneos-lado">
          <div className="mostrar-torneos-container">
            <button className="btn-azul" onClick={() => {
              setMostrarTorneos(!mostrarTorneos);
              if (!mostrarTorneos) obtenerTorneos();
            }}>
              {mostrarTorneos ? 'Ocultar torneos' : 'Mostrar torneos'}
            </button>
          </div>
  
          {mostrarTorneos && (
            <div className="torneo-grid">
              {torneos.map(t => (
                <div key={t.id_torneo} className="torneo-card">
                  <h3>{t.nombre_torneo}</h3>
                  <p><strong>Inicio:</strong> {new Date(t.fecha_inicio).toLocaleDateString()}</p>
                  <p><strong>Fin:</strong> {new Date(t.fecha_fin).toLocaleDateString()}</p>
                  <p><strong>Cierre inscripción:</strong> {new Date(t.fecha_cierre_inscripcion).toLocaleDateString()}</p>
                  <p><strong>Máx equipos:</strong> {t.max_equipos}</p>
  
                  <div className="torneo-botones">
                    <button onClick={() => toggleExpandir(t.id_torneo)}>
                      {torneosExpandido[t.id_torneo] ? 'Ocultar equipos' : 'Ver equipos'}
                    </button>
                    <button onClick={() => setEditando(t)} className="btn-warning">Editar</button>
                    <button onClick={() => eliminarTorneo(t.id_torneo)} className="btn-danger">Eliminar Torneo</button>
                    <button onClick={() => generarGrupos(t.id_torneo)} className="btn-generar">Generar Grupos</button>
                  </div>
  
                  {torneosExpandido[t.id_torneo] && (
                    <ul className="equipo-lista">
                      {Array.isArray(equiposPorTorneo[t.id_torneo]) && equiposPorTorneo[t.id_torneo].length > 0 ? (
                        equiposPorTorneo[t.id_torneo].map(e => (
                          <li key={e.id_equipo}>
                            <span>{e.nombre_equipo}</span>
                            <span className="equipo-detalle">{e.nombre_jugador1} {e.apellido_jugador1} / {e.nombre_jugador2} {e.apellido_jugador2}</span>
                            <button onClick={() => eliminarEquipo(e.id_equipo)} className="btn-warning">Eliminar equipo</button>
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
          )}
        </div>
      </div>
  
      {/* MODAL DE EDICIÓN */}
      {editando && (
        <div className="editar-form-modal">
          <h3>Editar Torneo</h3>
          <input
            type="text"
            value={formEdit.nombre_torneo || ''}
            onChange={(e) => setFormEdit({ ...formEdit, nombre_torneo: e.target.value })}
            placeholder="Nombre del torneo"
          />
          <input
            type="date"
            value={formEdit.fecha_inicio || ''}
            onChange={(e) => setFormEdit({ ...formEdit, fecha_inicio: e.target.value })}
          />
          <input
            type="date"
            value={formEdit.fecha_fin || ''}
            onChange={(e) => setFormEdit({ ...formEdit, fecha_fin: e.target.value })}
          />
          <input
            type="date"
            value={formEdit.fecha_cierre_inscripcion || ''}
            onChange={(e) => setFormEdit({ ...formEdit, fecha_cierre_inscripcion: e.target.value })}
          />
          <input
            type="number"
            value={formEdit.max_equipos || ''}
            onChange={(e) => setFormEdit({ ...formEdit, max_equipos: e.target.value })}
            placeholder="Máx equipos"
          />
          <select
            value={formEdit.categoria || ''}
            onChange={(e) => setFormEdit({ ...formEdit, categoria: e.target.value })}
          >
            <option value="">Seleccioná una categoría</option>
            {categorias.map((cat) => (
              <option key={cat.categoria} value={cat.categoria}>{cat.nombre}</option>
            ))}
          </select>
          <button onClick={editarTorneo}>Guardar Cambios</button>
          <button onClick={() => setEditando(null)}>Cancelar</button>
        </div>
      )}
    </>
  );
  
}

export default CrearTorneo;
