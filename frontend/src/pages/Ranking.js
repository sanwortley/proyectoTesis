import { useEffect, useState } from 'react';
import axios from 'axios';
import { formatName } from '../utils/formatName';
import '../style.css';
import '../ranking.css'; // New refined styles

function Ranking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const res = await axios.get('/api/categorias');
        setCategorias(res.data || []);
      } catch (err) {
        console.error('Error al cargar categorías', err);
      }
    };
    fetchCategorias();
  }, []);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        setLoading(true);
        setError('');

        const params = {};
        if (categoria) {
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
      <main className="ranking-page">
        <header className="ranking-header">
          <h1 className="ranking-title">Ranking de Jugadores</h1>
          <p className="ranking-subtitle">
            Explorá el desempeño de los mejores jugadores. Puntos basados en fase alcanzada y bonus por victorias.
          </p>
        </header>

        {/* Filtro por categoría */}
        <section className="filter-section">
          <label className="filter-label">Filtrar por categoría:</label>
          <select
            className="filter-select"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.id_categoria} value={cat.valor_numerico}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </section>

        <section className="ranking-content">
          {loading && (
            <div className="ranking-loader">
              <div className="spinner"></div>
              <p>Actualizando ranking...</p>
            </div>
          )}

          {error && !loading && (
            <div className="empty-state">
              <span className="empty-state-icon">⚠️</span>
              <p className="error-text">{error}</p>
            </div>
          )}

          {!loading && !error && ranking.length === 0 && (
            <div className="empty-state">
              <span className="empty-state-icon">🏆</span>
              <p className="empty-state-text">
                {categoria
                  ? 'No hay registros de ranking para esta categoría todavía.'
                  : 'El ranking se está calculando. ¡Vuelve pronto!'}
              </p>
            </div>
          )}

          {!loading && !error && ranking.length > 0 && (
            <>
              <div className="table-wrapper">
                <table className="pro-ranking-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Jugador</th>
                      <th>Última pareja</th>
                      <th>Último torneo</th>
                      <th>Fase</th>
                      <th style={{ textAlign: 'right' }}>Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((row, index) => (
                      <tr key={row.id || index}>
                        <td className="pos-cell">{index + 1}</td>
                        <td className="player-name-cell">{formatName(row.nombre, row.apellido, row.apodo)}</td>
                        <td>{row.ultima_pareja || '-'}</td>
                        <td>{row.torneo_participado || '-'}</td>
                        <td>
                          {row.fase_llegada ? (
                            <span className="fase-badge">{row.fase_llegada}</span>
                          ) : '-'}
                        </td>
                        <td className="pts-cell">{row.puntos ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="legend-section">
                <strong>Referencia de Puntos (Base):</strong> Campeón (2000), Subcampeón (1200), Semis (720), Cuartos (360), Octavos (180).
                Incluye bonus por partidos ganados, sets y efectividad en grupos.
              </footer>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default Ranking;

