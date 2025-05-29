// src/context/AuthContext.js
import { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [jugador, setJugador] = useState(null); // { rol: 'jugador' | 'organizador' }

  return (
    <AuthContext.Provider value={{ jugador, setJugador }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
