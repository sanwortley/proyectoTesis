import { useState, useEffect } from 'react';
import axios from 'axios';
import logo from '../assets/logo.jpg'; 
import { Link } from 'react-router-dom';
import '../style.css'; // Asegurate de tener los estilos cargados

function CrearTorneo() {
  const [nombre, setNombre] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [cierreInscripcion, setCierreInscripcion] = useState('');
  const [cantidadMaximaEquipos, setCantidadMaximaEquipos] = useState('');
  const [idCategoria, setIdCategoria] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

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
        nombre,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        cierre_inscripcion: cierreInscripcion,
        cantidad_maxima_equipos: parseInt(cantidadMaximaEquipos),
        id_categoria: parseInt(idCategoria)
      });

      setMensaje('Torneo creado con éxito');
      // Reset campos
      setNombre('');
      setFechaInicio('');
      setFechaFin('');
      setCierreInscripcion('');
      setCantidadMaximaEquipos('');
      setIdCategoria('');
    } catch (err) {
      setError('Error al crear torneo');
    }
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/home-organizador">
          <img src={logo} alt="Logo" className="navbar-logo" />
        </Link>
      </nav>
    <div className="crear-torneo-container">
    
    <form onSubmit={handleSubmit} className="crear-torneo-form">
      <h2>Crear Torneo</h2>
  
      {mensaje && <p className="success">{mensaje}</p>}
      {error && <p className="error">{error}</p>}
  
      <input
        type="text"
        value={nombre}
        placeholder="Nombre del torneo"
        onChange={(e) => setNombre(e.target.value)}
        required
      />
  
      <label>Fecha de inicio del torneo</label>
      <input
        type="date"
        value={fechaInicio}
        onChange={(e) => setFechaInicio(e.target.value)}
        required
      />
  
      <label>Fecha de finalización del torneo</label>
      <input
        type="date"
        value={fechaFin}
        onChange={(e) => setFechaFin(e.target.value)}
        required
      />
  
      <label>Fecha de cierre de inscripción</label>
      <input
        type="date"
        value={cierreInscripcion}
        onChange={(e) => setCierreInscripcion(e.target.value)}
        required
      />
  
      <input
        type="number"
        placeholder="Máx equipos"
        value={cantidadMaximaEquipos}
        onChange={(e) => setCantidadMaximaEquipos(e.target.value)}
        required
      />
  
      <select value={idCategoria} onChange={(e) => setIdCategoria(e.target.value)} required>
        <option value="">Seleccioná una categoría</option>
        {categorias.map((cat) => (
          <option key={cat.id_categoria} value={cat.id_categoria}>
            {cat.nombre}
          </option>
        ))}
      </select>
  
      <button type="submit">Crear Torneo</button>
    </form>
  </div>
  </>
  
  );
}

export default CrearTorneo;
