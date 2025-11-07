// src/pages/Login.js
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import '../style.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setJugador } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await axios.post('/api/login', { email, password });
      const { token, jugador } = res.data;

      const role = (jugador?.role ?? jugador?.rol ?? 'invitado').toLowerCase();

      // 🔧 Normalizamos SIEMPRE las mismas claves:
      const user = {
        id: jugador.id ?? jugador.id_jugador,
        nombre: jugador.nombre ?? jugador.nombre_jugador ?? '',
        apellido: jugador.apellido ?? jugador.apellido_jugador ?? '',
        email: jugador.email ?? '',
        role,
        token,
      };

      setJugador?.(user);
      localStorage.setItem('user', JSON.stringify(user)); // <- clave única y consistente

      if (role === 'organizador') navigate('/home-organizador', { replace: true });
      else if (role === 'jugador') navigate('/home-jugador', { replace: true });
      else navigate('/home-invitado', { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) setError('Usuario o contraseña incorrectos');
      else if (status === 404) setError('Jugador no encontrado');
      else setError('No se pudo iniciar sesión. Intentá nuevamente.');
      console.error('Login error:', err?.response?.data || err.message);
    }
  };

  const entrarComoInvitado = () => {
    const user = { role: 'invitado' };
    localStorage.setItem('user', JSON.stringify(user));
    setJugador?.(user);
    navigate('/home-invitado', { replace: true });
  };

  return (
    <div className="main-container">
      <img src={logo} alt="Logo del torneo" className="logo" />
      <div className="form-container">
        <h2>Iniciar sesión</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button type="submit">Ingresar</button>
        </form>
        <div className="login-links">
          <button type="button" className="link-button" onClick={() => navigate('/registro')}>
            ¿No tenés cuenta? Registrate
          </button>
          <button type="button" className="link-button" onClick={entrarComoInvitado}>
            Entrar como invitado
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
