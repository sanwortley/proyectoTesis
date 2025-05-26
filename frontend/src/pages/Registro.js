// Si no usás useEffect, no lo importes
import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom'; // solo Link si no usás navigate
import logo from '../assets/logo.jpg';
import '../style.css';



function Registro() {
  const [form, setForm] = useState({
    nombre_completo: '',
    email: '',
    telefono: '',
    password: '',
    confirmar_password: ''
  });

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/registro`, form);
      setMensaje('Registro exitoso. Redirigiendo al login...');
      setTimeout(() => {
        navigate('/');
      }, 2000); // redirige después de 2 segundos
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
    }
  };

  return (
    <div className="crear-torneo-container">

      <form onSubmit={handleSubmit} className="crear-torneo-form">
        <h2>Registro de Jugador</h2>

        {mensaje && <p className="success">{mensaje}</p>}
        {error && <p className="error">{error}</p>}

        <input
          type="text"
          name="nombre_completo"
          placeholder="Nombre completo"
          value={form.nombre_completo}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Correo electrónico"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="telefono"
          placeholder="Teléfono"
          value={form.telefono}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="confirmar_password"
          placeholder="Confirmar contraseña"
          value={form.confirmar_password}
          onChange={handleChange}
          required
        />
        <button type="submit">Registrarme</button>
      </form>
    </div>
  );
}

export default Registro;
