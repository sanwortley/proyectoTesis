import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo.png';
import '../style.css';

function Inscripcion() {
 
  const navigate = useNavigate();
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
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const { jugador } = useAuth();
  
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/jugadores`)
      .then(res => {
        console.log("Jugadores cargados:", res.data); // DEBUG opcional
        setJugadores(res.data);
      })
      .catch(() => console.error('Error al cargar jugadores'));

    axios.get(`${process.env.REACT_APP_API_URL}/torneos`)
      .then(res => {
        const hoy = new Date();
        const torneosAbiertos = res.data.filter(t => new Date(t.fecha_cierre_inscripcion) >= hoy);
        setTorneos(torneosAbiertos);
      })
      .catch(() => console.error('Error al cargar torneos'));
  }, []);

  useEffect(() => {
    const verificarEstado = async () => {
      if (!torneoId || !jugador || !jugador2Id) return;
  
      try {
        const resInscripcion = await axios.post(`${process.env.REACT_APP_API_URL}/verificar-inscripcion`, {
          jugador1_id: jugador.id_jugador,
          jugador2_id: jugador2Id,
          id_torneo: torneoId
        });
  
      
        setJugador1Inscripto(resInscripcion.data.jugador1Inscripto);
        setJugador2Inscripto(resInscripcion.data.jugador2Inscripto);
  
        const resCupo = await axios.get(`${process.env.REACT_APP_API_URL}/torneos/${torneoId}/verificar-cupo`);
        setTorneoLleno(resCupo.data.lleno);
      } catch (err) {
        console.error('Error al verificar inscripción o cupo:', err);
      }
    };
  
    verificarEstado();
  }, [jugador2Id, torneoId, jugador]);


  if (!jugador) {
    return (
      <div className="no-logueado-container">
        <h2>No estás logueado</h2>
        <p>Por favor, iniciá sesión para poder inscribirte en un torneo.</p>
        <Link to="/" className="volver-login-boton">Volver al login</Link>
      </div>
    );
  }



  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/inscripcion`, {
        jugador1_id: jugador.id_jugador,
        jugador2_id: jugador2Id,
        id_torneo: torneoId
      });

      setMensaje(res.data.mensaje || 'Inscripción exitosa');
      setJugador2Id('');
      setTorneoId('');

      setTimeout(() => {
        navigate('/home-jugador');
      }, 2000);
    } catch (err) {
      console.error('Error al inscribirse:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Error al inscribirse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-logo-container">
          <Link to="/home-jugador">
            <img src={logo} alt="Logo" className="navbar-logo" />
          </Link>
        </div>
  
        <div className="navbar-links">
          <Link to="/torneosllave">Torneos</Link>
          <Link to="/inscripcion" className={isActive('/inscripcion') ? 'active-link' : ''}>Inscripción</Link>
          <Link to="/ranking">Ranking</Link>
        </div>
      </nav>
  
      <form onSubmit={handleSubmit} className="inscripcion-form">
        <h2 className="inscripcion-titulo">Inscribite al Torneo</h2>
  
        {mensaje && <p className="success">{mensaje}</p>}
        {error && <p className="error">{error}</p>}
        {torneoLleno && <p className="error">Este torneo ya está lleno.</p>}
        {jugador1Inscripto && <p className="error">Ya estás inscripto en este torneo.</p>}
        {jugador2Inscripto && <p className="error">El jugador seleccionado como compañero ya está inscripto en este torneo.</p>}
  
        {jugador && (
          <>
            <label className="inscripcion-label">Jugador principal:</label>
            <input
              className="inscripcion-input"
              value={`${jugador.nombre_jugador} ${jugador.apellido_jugador}`}
              disabled
            />
          </>
        )}
  
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
              j.id_jugador !== jugador?.id_jugador &&
              j.rol?.toLowerCase() === 'jugador'
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
