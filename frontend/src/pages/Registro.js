// src/pages/Registro.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import '../style.css';

function Registro() {
  const [form, setForm] = useState({
    nombre_jugador: '',
    apellido_jugador: '',
    apodo: '', // 🔥 Nuevo
    email: '',
    telefono: '',
    password: '',
    confirmar_password: '',
    categoria_id: ''
  });

  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const navigate = useNavigate();

  // 🔥 Cargar categorías reales
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/categorias`)
      .then(res => setCategorias(res.data))
      .catch(() => setError('No se pudieron cargar las categorías'));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    // Validación básica
    if (!form.nombre_jugador.trim() || !form.apellido_jugador.trim()) {
      setError('Nombre y apellido son obligatorios');
      return;
    }

    // Teléfono solo numérico
    if (!/^\d+$/.test(form.telefono)) {
      setError('El teléfono debe contener solo números');
      return;
    }

    // Contraseñas coinciden
    if (form.password !== form.confirmar_password) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!form.categoria_id) {
      setError('Seleccioná tu categoría');
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/registro`, form);
      setMensaje('Registro exitoso. Redirigiendo al login...');

      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
    }
  };

  return (
    <div className="registro-form-container">
      <img src={logo} alt="Logo del torneo" className="logo" />

      <form onSubmit={handleSubmit} className="registro-form">
        <h2>Registro de Jugador</h2>

        {mensaje && <p className="success">{mensaje}</p>}
        {error && <p className="error">{error}</p>}

        <input
          type="text"
          name="nombre_jugador"
          placeholder="Nombre"
          value={form.nombre_jugador}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="apellido_jugador"
          placeholder="Apellido"
          value={form.apellido_jugador}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="apodo"
          placeholder="Apodo (Opcional)"
          value={form.apodo}
          onChange={handleChange}
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
          placeholder="Teléfono (solo números)"
          value={form.telefono}
          onChange={handleChange}
          required
        />

        {/* 🔥 SELECT DE CATEGORÍA */}
        <select
          name="categoria_id"
          value={form.categoria_id}
          onChange={handleChange}
          className="registro-select"
          required
        >
          <option value="">Seleccioná tu categoría</option>
          {categorias.map((cat) => (
            <option key={cat.id_categoria} value={cat.id_categoria}>
              {cat.nombre}
            </option>
          ))}
        </select>

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
