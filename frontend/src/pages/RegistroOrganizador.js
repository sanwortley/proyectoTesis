// src/pages/RegistroOrganizador.js
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo.png';
import '../style.css';

function RegistroOrganizador() {
    const [formData, setFormData] = useState({
        nombre_jugador: '',
        apellido_jugador: '',
        apodo: '',
        email: '',
        telefono: '',
        password: '',
        confirmar_password: '',
        admin_token: '' // 🔐 Nuevo campo
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validaciones
        if (formData.password !== formData.confirmar_password) {
            setError('Las contraseñas no coinciden');
            return;
        }

        try {
            await axios.post('/api/registro-organizadores', formData);
            setSuccess('¡Organizador registrado con éxito! Redirigiendo...');
            setTimeout(() => navigate('/'), 2000); // Ir al login
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Error al registrar organizador');
        }
    };

    return (
        <div className="main-container">
            <img src={logo} alt="Logo" className="logo" />
            <div className="form-container">
                <h2 style={{ color: '#ecf0f1' }}>Registro de Administrador</h2>

                {error && <p className="error-msg">{error}</p>}
                {success && <p className="success-msg">{success}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Código de Seguridad (Token)</label>
                        <input
                            type="password"
                            name="admin_token"
                            placeholder="Ingresá la clave secreta..."
                            value={formData.admin_token}
                            onChange={handleChange}
                            required
                            className="input-token"
                            style={{ border: '2px solid #e74c3c' }} // Destacar que es importante
                        />
                    </div>

                    <div className="form-row">
                        <input
                            type="text"
                            name="nombre_jugador"
                            placeholder="Nombre"
                            value={formData.nombre_jugador}
                            onChange={handleChange}
                            required
                        />
                        <input
                            type="text"
                            name="apellido_jugador"
                            placeholder="Apellido"
                            value={formData.apellido_jugador}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <input
                        type="text"
                        name="apodo"
                        placeholder="Apodo (Opcional)"
                        value={formData.apodo}
                        onChange={handleChange}
                        className="input-full"
                    />

                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="tel"
                        name="telefono"
                        placeholder="Teléfono (opcional)"
                        value={formData.telefono}
                        onChange={handleChange}
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Contraseña"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="password"
                        name="confirmar_password"
                        placeholder="Confirmar Contraseña"
                        value={formData.confirmar_password}
                        onChange={handleChange}
                        required
                    />

                    <button type="submit" className="boton-primario">
                        Crear Organizador
                    </button>
                </form>

                <div className="login-links">
                    <button type="button" className="link-button" onClick={() => navigate('/')}>
                        Volver al Login
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RegistroOrganizador;
