import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../style.css';
import '../admin.css'; // Import the new professional styles

export default function AdminJugadores() {
    const [jugadores, setJugadores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Estados para Edición y Creación
    const [editingPlayer, setEditingPlayer] = useState(null); // Si tiene ID es edición, si es objeto vacío es creación
    const [isCreating, setIsCreating] = useState(false);
    const [categorias, setCategorias] = useState([]);

    // Formulario (reutilizado)
    const [formData, setFormData] = useState({
        nombre_jugador: '',
        apellido_jugador: '',
        apodo: '',
        email: '',
        telefono: '',
        categoria_id: '',
        password: '' // Solo para creación
    });

    // Cargar jugadores y categorías
    const fetchData = async () => {
        try {
            setLoading(true);
            const [resJ, resC] = await Promise.all([
                axios.get('/api/jugadores'),
                axios.get('/api/categorias')
            ]);

            const sorted = resJ.data.sort((a, b) => a.nombre_jugador.localeCompare(b.nombre_jugador));
            setJugadores(sorted);
            setCategorias(resC.data);
            setError('');
        } catch (err) {
            console.error(err);
            setError('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // DELETE
    const handleDelete = async (id, nombre) => {
        if (!window.confirm(`¿Estás seguro de eliminar a ${nombre}? Esta acción no se puede deshacer.`)) {
            return;
        }
        try {
            await axios.delete(`/api/jugadores/${id}`);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Error al eliminar jugador. Verificá si tiene torneos activos.');
        }
    };

    // OPEN CREATE
    const handleCreateClick = () => {
        setIsCreating(true);
        setEditingPlayer(null);
        setFormData({
            nombre_jugador: '',
            apellido_jugador: '',
            apodo: '',
            email: '',
            telefono: '',
            categoria_id: '',
            password: ''
        });
    };

    // OPEN EDIT
    const handleEditClick = (player) => {
        setIsCreating(false);
        setEditingPlayer(player);
        setFormData({
            nombre_jugador: player.nombre_jugador,
            apellido_jugador: player.apellido_jugador,
            apodo: player.apodo || '',
            email: player.email || '',
            telefono: player.telefono || '',
            categoria_id: player.categoria_id || '',
            password: '' // No se edita pass aquí por ahora
        });
    };

    // SAVE (Create or Edit)
    const handleSave = async (e) => {
        e.preventDefault();

        try {
            if (isCreating) {
                await axios.post('/api/jugadores', formData);
            } else if (editingPlayer) {
                await axios.put(`/api/jugadores/${editingPlayer.id_jugador}`, formData);
            }
            setIsCreating(false);
            setEditingPlayer(null);
            fetchData();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || 'Error al guardar jugador.');
        }
    };

    // CANCEL
    const handleCancel = () => {
        setIsCreating(false);
        setEditingPlayer(null);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const [searchTerm, setSearchTerm] = useState('');

    // Filtrar jugadores
    const filteredJugadores = jugadores.filter(j => {
        const term = searchTerm.toLowerCase();
        return (
            j.nombre_jugador.toLowerCase().includes(term) ||
            j.apellido_jugador.toLowerCase().includes(term) ||
            (j.apodo && j.apodo.toLowerCase().includes(term)) ||
            (j.email && j.email.toLowerCase().includes(term))
        );
    });

    if (loading) return <div className="admin-container" style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>;

    return (
        <div className="admin-container" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ borderBottom: 'none', margin: 0, padding: 0 }}>Gestión de Jugadores</h2>
                <button className="btn-save" style={{ maxWidth: '200px' }} onClick={handleCreateClick}>
                    + NUEVO JUGADOR
                </button>
            </div>

            {error && <p className="error-msg">{error}</p>}

            {/* Buscador */}
            <div className="search-container">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    placeholder="Buscar por nombre, apellido, apodo o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            {/* Modal de Edición / Creación */}
            {(editingPlayer || isCreating) && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{isCreating ? 'Nuevo Jugador' : 'Editar Jugador'}</h3>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Nombre</label>
                                <input name="nombre_jugador" value={formData.nombre_jugador} onChange={handleChange} required className="modal-input" />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Apellido</label>
                                <input name="apellido_jugador" value={formData.apellido_jugador} onChange={handleChange} required className="modal-input" />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Apodo</label>
                                <input name="apodo" value={formData.apodo} onChange={handleChange} className="modal-input" />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input name="email" value={formData.email} onChange={handleChange} required className="modal-input" />
                            </div>

                            {isCreating && (
                                <div className="form-group">
                                    <label className="form-label">Contraseña (Opcional, defecto: 123456)</label>
                                    <input name="password" type="password" value={formData.password} onChange={handleChange} className="modal-input" placeholder="******" />
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Teléfono</label>
                                <input name="telefono" value={formData.telefono} onChange={handleChange} className="modal-input" />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Categoría</label>
                                <select name="categoria_id" value={formData.categoria_id} onChange={handleChange} required className="modal-input">
                                    <option value="">-- Seleccionar --</option>
                                    {categorias.map(c => (
                                        <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button type="submit" className="btn-save">GUARDAR</button>
                                <button type="button" onClick={handleCancel} className="btn-cancel">CANCELAR</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="table-responsive">
                <table className="pro-table contain-text">
                    <thead>
                        <tr>
                            <th className="col-nombre">Nombre</th>
                            <th className="col-apellido">Apellido</th>
                            <th className="col-apodo">Apodo</th>
                            <th className="col-email">Email</th>
                            <th className="col-rol">Rol</th>
                            <th className="col-categoria">Categoría</th>
                            <th className="col-actions">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredJugadores.map((j) => (
                            <tr key={j.id_jugador}>
                                <td className="col-nombre">{j.nombre_jugador}</td>
                                <td className="col-apellido">{j.apellido_jugador}</td>
                                <td className="col-apodo"><span style={{ color: '#ffd700' }}>{j.apodo || '-'}</span></td>
                                <td className="col-email" title={j.email}>{j.email || '-'}</td>
                                <td className="col-rol">
                                    <span style={{
                                        backgroundColor: j.rol === 'organizador' ? '#ffd700' : 'transparent',
                                        color: j.rol === 'organizador' ? 'black' : 'inherit',
                                        padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px'
                                    }}>
                                        {j.rol}
                                    </span>
                                </td>
                                <td className="col-categoria">{j.categoria_nombre || '-'}</td>
                                <td className="col-actions">
                                    <button
                                        className="btn-action btn-edit"
                                        onClick={() => handleEditClick(j)}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        className="btn-action btn-delete"
                                        onClick={() => handleDelete(j.id_jugador, j.nombre_jugador)}
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
