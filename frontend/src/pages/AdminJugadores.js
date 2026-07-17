import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Search } from 'lucide-react';
import axios from 'axios';
import '../style.css';
import '../admin.css';

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

    // Registro organizador
    const [isCreatingOrg, setIsCreatingOrg] = useState(false);
    const [orgForm, setOrgForm] = useState({
        nombre_jugador: '', apellido_jugador: '', apodo: '',
        email: '', telefono: '', password: '', confirmar_password: '', admin_token: ''
    });
    const [orgError, setOrgError] = useState('');
    const [orgSuccess, setOrgSuccess] = useState('');

    const handleOrgChange = (e) => setOrgForm({ ...orgForm, [e.target.name]: e.target.value });

    const handleOrgSave = async (e) => {
        e.preventDefault();
        setOrgError('');
        setOrgSuccess('');
        if (orgForm.password !== orgForm.confirmar_password) {
            setOrgError('Las contraseñas no coinciden');
            return;
        }
        try {
            await axios.post('/api/registro-organizadores', orgForm);
            setOrgSuccess('¡Organizador creado con éxito!');
            setTimeout(() => {
                setIsCreatingOrg(false);
                setOrgForm({ nombre_jugador: '', apellido_jugador: '', apodo: '', email: '', telefono: '', password: '', confirmar_password: '', admin_token: '' });
                setOrgSuccess('');
                fetchData();
            }, 1500);
        } catch (err) {
            setOrgError(err.response?.data?.error || 'Error al registrar organizador');
        }
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

    if (loading) return <div className="admin-container admin-page-container" style={{ textAlign: 'center' }}>Cargando...</div>;

    return (
        <div className="admin-container admin-page-container">
            <div className="admin-page-header">
                <h2 className="admin-page-title">Gestión de Jugadores</h2>
                <div className="admin-btn-group">
                    <button className="btn-save admin-btn-nuevo" onClick={handleCreateClick}>
                        + NUEVO JUGADOR
                    </button>
                    <button
                        className="btn-save admin-btn-nuevo"
                        style={{ backgroundColor: '#1a1a2e', borderColor: '#FFD700', color: '#FFD700' }}
                        onClick={() => { setIsCreatingOrg(true); setOrgError(''); setOrgSuccess(''); }}
                    >
                        + NUEVO ORGANIZADOR
                    </button>
                </div>
            </div>

            {error && <p className="error-msg">{error}</p>}

            {/* Buscador */}
            <div className="search-container">
                <Search size={18} className="search-icon" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, apellido, apodo o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            {/* Modal de Edición / Creación */}
            {(editingPlayer || isCreating) && ReactDOM.createPortal(
                <div className="modal-overlay">
                    <div className="modal-content premium-modal">
                        <h3>{isCreating ? 'Nuevo Jugador' : 'Editar Jugador'}</h3>
                        <div className="modal-scroll-area">
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
                </div>,
                document.body
            )}

            {/* Modal Nuevo Organizador */}
            {isCreatingOrg && ReactDOM.createPortal(
                <div className="modal-overlay">
                    <div className="modal-content premium-modal">
                        <h3>Nuevo Organizador</h3>
                        <div className="modal-scroll-area">
                            {orgError && <p className="error-msg" style={{ marginBottom: '1rem' }}>{orgError}</p>}
                            {orgSuccess && <p className="success-msg" style={{ marginBottom: '1rem' }}>{orgSuccess}</p>}
                            <form onSubmit={handleOrgSave}>
                                <div className="form-group">
                                    <label className="form-label">Código de seguridad</label>
                                    <input
                                        name="admin_token"
                                        type="password"
                                        value={orgForm.admin_token}
                                        onChange={handleOrgChange}
                                        required
                                        className="modal-input"
                                        placeholder="Clave secreta de administrador"
                                        style={{ border: '2px solid #e74c3c' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nombre</label>
                                    <input name="nombre_jugador" value={orgForm.nombre_jugador} onChange={handleOrgChange} required className="modal-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Apellido</label>
                                    <input name="apellido_jugador" value={orgForm.apellido_jugador} onChange={handleOrgChange} required className="modal-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Apodo (opcional)</label>
                                    <input name="apodo" value={orgForm.apodo} onChange={handleOrgChange} className="modal-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input name="email" type="email" value={orgForm.email} onChange={handleOrgChange} required className="modal-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Teléfono (opcional)</label>
                                    <input name="telefono" value={orgForm.telefono} onChange={handleOrgChange} className="modal-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contraseña</label>
                                    <input name="password" type="password" value={orgForm.password} onChange={handleOrgChange} required className="modal-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirmar contraseña</label>
                                    <input name="confirmar_password" type="password" value={orgForm.confirmar_password} onChange={handleOrgChange} required className="modal-input" />
                                </div>
                                <div className="modal-actions">
                                    <button type="submit" className="btn-save">CREAR</button>
                                    <button type="button" onClick={() => setIsCreatingOrg(false)} className="btn-cancel">CANCELAR</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <div className="table-responsive">
                <table className="pro-table contain-text">
                    <thead>
                        <tr>
                            <th className="col-nombre">Foto</th>
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
                                <td className="col-foto">
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        backgroundColor: '#333',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid #ffd700'
                                    }}>
                                        {j.foto_perfil ? (
                                            <img
                                                src={`http://localhost:3000/${j.foto_perfil}`}
                                                alt={j.nombre_jugador}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.style.display = 'none' }}
                                            />
                                        ) : (
                                            <span style={{ color: '#ffd700', fontSize: '0.8rem' }}>
                                                {j.nombre_jugador.charAt(0)}{j.apellido_jugador.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                </td>
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
