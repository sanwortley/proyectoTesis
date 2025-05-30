import { useState, useEffect } from 'react';
// eslint-disable-next-line
import { Link, useNavigate } from 'react-router-dom';
// eslint-disable-next-line
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import logo from '../assets/logo.png';
import '../style.css';

export default function Torneos() {
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [torneos, setTorneos] = useState([]);
  const [fase, setFase] = useState('grupos');
  const [grupos, setGrupos] = useState([]);
  // eslint-disable-next-line
  const [torneoId, setTorneoId] = useState(null);

  // Obtener categorías
  useEffect(() => {
    axios.get('http://localhost:3000/api/categorias')
      .then(res => {
        console.log('Categorías:', res.data);
        setCategorias(res.data);
      })
      .catch(err => {
        console.error('Error al obtener categorías:', err);
      });
  }, []);

  // Obtener torneos
  useEffect(() => {
    axios.get('http://localhost:3000/api/torneos')
      .then(res => {
        console.log('Torneos:', res.data);
        setTorneos(res.data);
      })
      .catch(err => {
        console.error('Error al obtener torneos:', err);
      });
  }, []); // <-- te faltaba este array de dependencias

  // Cuando se elige una categoría
  useEffect(() => {
    const categoriaObj = categorias.find(c => c.nombre === categoriaSeleccionada);
    if (!categoriaObj) return;
  
    const torneo = torneos.find(t => t.categoria === categoriaObj.id_categoria);
    if (torneo) {
      setTorneoId(torneo.id_torneo);
      axios.get(`http://localhost:3000/api/torneos/${torneo.id_torneo}/grupos`)
        .then(res => {
          console.log('Grupos:', res.data.grupos);
          setGrupos(res.data.grupos);
        })
        .catch(err => {
          console.error('Error al obtener grupos:', err);
        });
    }   else    {
        setGrupos([]);
    }

  }, [categoriaSeleccionada, torneos, categorias]);
  

  return (
    <>
      <nav className="navbar">
        <Link to="/home-jugador">
          <img src={logo} alt="Logo" className="navbar-logo" />
        </Link>
      </nav>
  
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">Torneos por categoría</h2>
  
        {/* Selector de categoría + botones */}
        <div className="selector-categoria-bloque">
          <div className="selector-y-botones">
            <select
              value={categoriaSeleccionada}
              onChange={e => setCategoriaSeleccionada(e.target.value)}
            >
              <option value="">Seleccioná una categoría</option>
              {categorias.map(cat => (
                <option key={cat.id_categoria} value={cat.nombre}>
                  {cat.nombre}
                </option>
              ))}
            </select>
  
            <button
              className={fase === 'grupos' ? 'activo' : ''}
              onClick={() => setFase('grupos')}
            >
              Fase de grupos
            </button>
  
            <button
              className={fase === 'playoffs' ? 'activo' : ''}
              onClick={() => setFase('playoffs')}
            >
              Play-offs
            </button>
          </div>
        </div>
  
        {fase === 'grupos' ? (
  grupos.length === 0 ? (
    <div className="mensaje-sin-grupos">
      No hay grupos generados para esta categoría.
    </div>
  ) : (
    <div className="grupos-grid">
      {grupos.map(grupo => (
        <div key={grupo.id_grupo} className="tarjeta-grupo">
          <h3 className="titulo-grupo">{grupo.nombre}</h3>

          <table className="tabla-grupo">
            <thead>
              <tr className="encabezado-tabla">
                <th>#</th>
                <th>Equipo</th>
                <th>PJ</th>
                <th>PTS</th>
                <th>Sets +</th>
                <th>Sets -</th>
              </tr>
            </thead>
            <tbody>
              {grupo.equipos.map((e, i) => (
                <tr key={e.equipo_id} className="fila-equipo">
                  <td>{i + 1}</td>
                  <td className="equipo-nombre">{e.nombre_equipo}</td>
                  <td>{e.partidos_jugados}</td>
                  <td>{e.puntos}</td>
                  <td>{e.sets_favor}</td>
                  <td>{e.sets_contra}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 className="subtitulo-partidos">Partidos</h4>
          <div className="partidos-contenedor">
            {grupo.partidos.map(p => {
              let estadoClass = 'partido-finalizado';
              if (p.estado === 'iniciado') estadoClass = 'partido-iniciado';
              if (p.estado === 'no_iniciado') estadoClass = 'partido-no-iniciado';

              const setsCargados = p.set1_equipo1 !== null && p.set1_equipo2 !== null;

              return (
                <div key={p.id} className={`partido-card ${estadoClass}`}>
                  <div className="equipos-y-sets">
                    <div className="equipos-nombres">
                      <div>{p.equipo1}</div>
                      <div>{p.equipo2}</div>
                    </div>
                    {setsCargados ? (
                      <div className="sets-partido">
                        <div>{p.set1_equipo1} {p.set2_equipo1} {p.set3_equipo1 ?? '-'}</div>
                        <div>{p.set1_equipo2} {p.set2_equipo2} {p.set3_equipo2 ?? '-'}</div>
                      </div>
                    ) : (
                      <div className="estado-texto">{p.estado.replace('_', ' ')}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  )
) : (
  <div className="mensaje-playoff">
    <p>Mostrando las llaves del torneo para <strong>{categoriaSeleccionada}</strong></p>
    <p className="mt-2">Próximamente: vista gráfica estilo playoffs</p>
  </div>
)}

        
      </div>
    </>
  );
  
}
