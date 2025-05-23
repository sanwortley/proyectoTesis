import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; // Asegurate de tener este context creado
import logo from '../assets/logo.jpg';
import '../style.css';

function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { setUsuario } = useAuth(); // contexto

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/login`, { login, password });
      console.log('Login exitoso', res.data);

      setUsuario(res.data.usuario); // Guarda el usuario en el contexto

      const rol = res.data.usuario.rol

      // Redirige según el rol
      if (rol === 'jugador') navigate('/home-jugador');
      else if (rol === 'organizador') navigate('/home-organizador');
      else navigate('/home-invitado');
    } catch (err) {
      setError('Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="main-container">
      <img src={logo} alt="Logo del torneo" className="logo" />
      <div className="form-container">
        <h2>Iniciar sesión</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Email o usuario"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Ingresar</button>
        </form>
        <div className="login-links">
          <button type="button" className="link-button" onClick={() => navigate('/registro')}>
            ¿No tenés cuenta? Registrate
          </button>
          <button type="button" className="link-button" onClick={() => navigate('/home-invitado')}>
            Entrar como invitado
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
