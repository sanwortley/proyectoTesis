// src/pages/Ranking.js
import { useEffect, useState } from 'react';
import axios from 'axios';
import '../style.css';

// Ajustá estos values para que coincidan con tu tabla "categoria"
// (id_categoria = 4..8 por ejemplo)
const CATEGORIAS = [
  { value: '',  label: 'Todas las categorías' },
  { value: 3,   label: '4ta' },
  { value: 4,   label: '5ta' },
  { value: 5,   label: '6ta' },
  { value: 6,   label: '7ma' },
  { value: 7    ,   label: '8va' },
];

function Ranking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [categoria, setCategoria] = useState('');   // id numérico en string

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        setLoading(true);
        setError('');

        const params = {};
        if (categoria) {
          // mandamos número, porque en la BD categoria es INTEGER
          params.categoria = Number(categoria);
        }

        const res = await axios.get('/api/ranking', { params });
        setRanking(res.data || []);
      } catch (err) {
        console.error('Error al cargar ranking', err);
        setError('No se pudo cargar el ranking. Intentá de nuevo en unos minutos.');
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, [categoria]);

  return (
    <div className="app-root">
      <main className="page-container">
        <section className="page-header">
          <h1 className="page-title">Ranking de Jugadores</h1>
          <p className="page-subtitle">
            Lista de todos los jugadores con su última pareja, torneo jugado, fase alcanzada y puntos.
          </p>
        </section>

        {/* Filtro por categoría */}
        <section className="card ranking-card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label className="inscripcion-label">Filtrar por categoría:</label>
            <select
              className="inscripcion-select"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              style={{ maxWidth: 250 }}
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat.value === '' ? 'all' : cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="card ranking-card">
          {loading && (
            <div className="card-body center-text">
              <p>Cargando ranking...</p>
            </div>
          )}

          {error && !loading && (
            <div className="card-body error-text">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && ranking.length === 0 && (
            <div className="card-body center-text">
              <p>
                {categoria
                  ? 'Ranking no disponible aún para esta categoría.'
                  : 'Aún no hay jugadores cargados en el ranking.'}
              </p>
            </div>
          )}

          {!loading && !error && ranking.length > 0 && (
            <div className="card-body">
              <div className="table-wrapper">
                <table className="ranking-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Jugador</th>
                      <th>Última pareja</th>
                      <th>Ultimo torneo</th>
                      <th>Fase alcanzada</th>
                      <th>Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((row, index) => (
                      <tr key={row.id || index}>
                        <td>{index + 1}</td>
                        <td>{row.nombre} {row.apellido}</td>
                        <td>{row.ultima_pareja || '-'}</td>
                        <td>{row.torneo_participado || '-'}</td>
                        <td>{row.fase_llegada || '-'}</td>
                        <td className="ranking-points">{row.puntos ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="ranking-legend">
                Puntos de referencia: 2000 (campeón) · 1000 (subcampeón) · 500 (semis) · 200 (cuartos) · 100 (octavos) · 50 (16avos)
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Ranking;
