import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../style.css';

// Import local images directly
import img1 from '../assets/carousel/uploaded_image_0_1769004889097.jpg';
import img2 from '../assets/carousel/uploaded_image_1_1769004889097.jpg';
import img3 from '../assets/carousel/uploaded_image_2_1769004889097.jpg';
import img4 from '../assets/carousel/uploaded_image_3_1769004889097.jpg';
import img5 from '../assets/carousel/uploaded_image_4_1769004889097.jpg';

const CAROUSEL_IMAGES = [img1, img2, img3, img4, img5];

// Carousel Component
function WinnersCarousel({ torneos }) {
    const navigate = useNavigate();
    const [current, setCurrent] = useState(0);

    // Auto-advance
    useEffect(() => {
        if (!torneos || torneos.length === 0) return;
        const timer = setInterval(() => {
            setCurrent(prev => (prev === torneos.length - 1 ? 0 : prev + 1));
        }, 5000);
        return () => clearInterval(timer);
    }, [torneos]);

    if (!torneos || torneos.length === 0) {
        return (
            <div className="home-carousel empty-carousel">
                <div className="carousel-caption">
                    <h3>Pro Cup Padel</h3>
                    <p>Próximamente grandes torneos...</p>
                </div>
            </div>
        );
    }

    // Ensure consistent image assignment
    const getCarouselImage = (index) => {
        return CAROUSEL_IMAGES[index % CAROUSEL_IMAGES.length];
    };

    return (
        <div className="home-carousel">
            {torneos.map((torneo, index) => (
                <div
                    key={torneo.id_torneo}
                    className={`carousel-slide ${index === current ? 'active' : ''}`}
                    onClick={() => navigate('/torneosllave')}
                    style={{ cursor: 'pointer' }}
                >
                    <img src={getCarouselImage(index)} alt={torneo.nombre_torneo} />
                    <div className="carousel-caption">
                        <h3>{torneo.nombre_torneo}</h3>
                        <p className="carousel-subtitle">
                            {torneo.categoria_nombre ? `Categoría ${torneo.categoria_nombre}` : 'Torneo Oficial'}
                        </p>
                        <div className="carousel-meta">
                            <span className={`status-badge`}>
                                VER DETALLES
                            </span>
                        </div>
                    </div>
                </div>
            ))}

            <div className="carousel-indicators">
                {torneos.map((_, idx) => (
                    <button
                        key={idx}
                        className={idx === current ? 'active' : ''}
                        onClick={(e) => { e.stopPropagation(); setCurrent(idx); }}
                    />
                ))}
            </div>
        </div>
    );
}

// Ranking Widget Component
function RankingWidget({ title, categoriaId }) {
    const [topPlayers, setTopPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!categoriaId) {
            setLoading(false);
            return;
        }

        axios.get(`/api/ranking?categoria=${categoriaId}`)
            .then(res => {
                // Tomamos solo top 3
                setTopPlayers(res.data.slice(0, 3));
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [categoriaId]);

    return (
        <div className="ranking-widget-card">
            <h3 className="widget-title">{title}</h3>
            {loading && categoriaId ? (
                <p className="widget-loading">Cargando...</p>
            ) : !categoriaId ? (
                <p className="widget-empty">Categoría no encontrada</p>
            ) : topPlayers.length === 0 ? (
                <p className="widget-empty">Aún no hay ranking.</p>
            ) : (
                <table className="widget-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Jugador</th>
                            <th>Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topPlayers.map((p, i) => (
                            <tr key={p.id || i}>
                                <td className={`pos-${i + 1}`}>{i + 1}</td>
                                <td className="player-name">{p.nombre} {p.apellido}</td>
                                <td className="player-points">{p.puntos}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

function Home() {
    const [categorias, setCategorias] = useState([]);
    const [recentTorneos, setRecentTorneos] = useState([]);

    // 1. Fetch Categorias
    useEffect(() => {
        axios.get('/api/categorias')
            .then(res => setCategorias(res.data))
            .catch(console.error);
    }, []);

    // 2. Fetch Torneos (Top 3 recent)
    useEffect(() => {
        axios.get('/api/torneos')
            .then(res => {
                const all = res.data || [];
                // Asumimos que la API devuelve ordenados, o los primeros son los más recientes
                // Si no, podríamos hacer sort aquí: 
                // all.sort((a,b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio));
                setRecentTorneos(all.slice(0, 3));
            })
            .catch(console.error);
    }, []);

    // Helpers para buscar ID por nombre (busqueda laxa)
    const getId = (namePart) => {
        if (!categorias.length) return null;
        const found = categorias.find(c => c.nombre.toLowerCase().includes(namePart.toLowerCase()));
        return found ? found.id_categoria : null;
    };

    return (
        <div className="home-container">
            {/* Hero Section with Carousel */}
            <section className="hero-section">
                <WinnersCarousel torneos={recentTorneos} />
            </section>

            {/* Rankings Preview Section */}
            <section className="rankings-preview-section">
                <h2 className="section-title">Ranking Oficial</h2>
                <div className="rankings-grid">
                    {/* Requested: 2da, 4ta, 8va */}
                    <RankingWidget title="2da Categoría" categoriaId={getId('2')} />
                    <RankingWidget title="4ta Categoría" categoriaId={getId('4')} />
                    <RankingWidget title="8va Categoría" categoriaId={getId('8')} />
                </div>

                <div className="actions-row">
                    <Link to="/ranking" className="main-button">
                        Ver Ranking Completo
                    </Link>
                </div>
            </section>
        </div>
    );
}

export default Home;
