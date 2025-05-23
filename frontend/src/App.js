  import { useEffect, useState } from 'react';
  import axios from 'axios';
  import './App.css';

  function App() {
    const [categorias, setCategorias] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
      axios.get(`${process.env.REACT_APP_API_URL}/categorias`)
        .then(res => setCategorias(res.data))
        .catch(err => setError('No se pudo conectar al backend'));
    }, []);

    return (
      <div className="App">
        <h1>Pro Cup Padel</h1>
        <h2>Categorías disponibles</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <ul>
          {categorias.map(cat => (
            <li key={cat.id_categoria}>{cat.nombre}</li>
          ))}
        </ul>
      </div>
    );
  }

  export default App;

