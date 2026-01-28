
import { useState, useEffect } from 'react';
import axios from 'axios';

function Perfil() {
    const [jugador, setJugador] = useState(null);
    const [formData, setFormData] = useState({
        nombre_jugador: '',
        apellido_jugador: '',
        apodo: '',
        email: '',
        telefono: '',
        password: '',
    });
    const [fotoPreview, setFotoPreview] = useState(null);
    const [archivoFoto, setArchivoFoto] = useState(null); // Para el file
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            const u = JSON.parse(stored);
            cargarDatos(u.id);
        }
    }, []);

    const cargarDatos = async (id) => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/jugadores/${id}`);
            setJugador(res.data);
            setFormData({
                nombre_jugador: res.data.nombre_jugador,
                apellido_jugador: res.data.apellido_jugador,
                apodo: res.data.apodo || '',
                email: res.data.email,
                telefono: res.data.telefono || '',
                password: '', // siempre vacía al inicio
            });
            if (res.data.foto_perfil) {
                const baseUrl = process.env.REACT_APP_API_URL.replace(/\/api$/, '');
                setFotoPreview(`${baseUrl}/${res.data.foto_perfil}`);
            }
        } catch (err) {
            console.error(err);
            setError('Error al cargar perfil');
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setArchivoFoto(file);
            setFotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMensaje('');
        setError('');

        try {
            const data = new FormData();
            data.append('nombre_jugador', formData.nombre_jugador);
            data.append('apellido_jugador', formData.apellido_jugador);
            data.append('apodo', formData.apodo);
            data.append('email', formData.email);
            data.append('telefono', formData.telefono);
            data.append('categoria_id', jugador.categoria_id); // Mantener categoria

            if (formData.password) {
                data.append('password', formData.password);
            }
            if (archivoFoto) {
                data.append('foto_perfil', archivoFoto);
            }

            const token = localStorage.getItem('token');
            const res = await axios.put(
                `${process.env.REACT_APP_API_URL}/jugadores/${jugador.id_jugador}`,
                data,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            setMensaje('Perfil actualizado con éxito');
            // Actualizar localStorage si cambió nombre/foto (opcional, pero buena práctica visual)
            const usuarioLocal = JSON.parse(localStorage.getItem('user'));
            const usuarioActualizado = { ...usuarioLocal, ...res.data.jugador };

            // Asegurar que el id se mantenga consistente
            if (usuarioActualizado.id_jugador) {
                usuarioActualizado.id = usuarioActualizado.id_jugador;
            }

            localStorage.setItem('user', JSON.stringify(usuarioActualizado));

            // Recargar datos para confirmar
            cargarDatos(jugador.id_jugador);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Error al actualizar perfil');
        }
    };

    if (!jugador) return <div className="contenedor-crear-torneo">Cargando perfil...</div>;

    return (
        <div className="contenedor-crear-torneo">
            <div className="crear-torneo-form" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h2>Mi Perfil</h2>

                {mensaje && <p className="success">{mensaje}</p>}
                {error && <p className="error">{error}</p>}

                <form onSubmit={handleSubmit} className="formulario-perfil">

                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <div style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            margin: '0 auto',
                            border: '2px solid #ffd700',
                            background: '#333'
                        }}>
                            {fotoPreview ? (
                                <img src={fotoPreview} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ display: 'block', lineHeight: '120px', color: '#777' }}>Sin Foto</span>
                            )}
                        </div>
                        <label htmlFor="fotoInput" style={{ cursor: 'pointer', color: '#ffd700', display: 'block', marginTop: '10px' }}>
                            Cambiar Foto de Perfil
                        </label>
                        <input
                            id="fotoInput"
                            type="file"
                            onChange={handleFileChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label>Nombre</label>
                            <input name="nombre_jugador" value={formData.nombre_jugador} onChange={handleChange} required />
                        </div>
                        <div>
                            <label>Apellido</label>
                            <input name="apellido_jugador" value={formData.apellido_jugador} onChange={handleChange} required />
                        </div>
                    </div>

                    <label>Apodo</label>
                    <input name="apodo" value={formData.apodo} onChange={handleChange} />

                    <label>Email</label>
                    <input name="email" value={formData.email} onChange={handleChange} type="email" required />

                    <label>Teléfono</label>
                    <input name="telefono" value={formData.telefono} onChange={handleChange} />

                    <hr style={{ borderColor: '#333', margin: '20px 0' }} />

                    <label style={{ color: '#fff' }}>Cambiar Contraseña (dejar vacío si no se desea cambiar)</label>
                    <input
                        name="password"
                        type="password"
                        placeholder="Nueva contraseña"
                        value={formData.password}
                        onChange={handleChange}
                    />

                    <button type="submit">Guardar Cambios</button>
                </form>
            </div>
        </div>
    );
}

export default Perfil;
