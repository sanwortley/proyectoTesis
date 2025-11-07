// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  // 👇 leer localStorage en el inicializador evita el 1er render "null"
  const [jugador, setJugador] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Persistir cambios
  useEffect(() => {
    if (jugador) localStorage.setItem("user", JSON.stringify(jugador));
    else localStorage.removeItem("user");
  }, [jugador]);

  const value = useMemo(() => ({ jugador, setJugador }), [jugador]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
