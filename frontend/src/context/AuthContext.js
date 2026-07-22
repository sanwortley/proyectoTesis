// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
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

  // Sesiones antiguas sin categoria_id: enriquecer automáticamente desde la API
  useEffect(() => {
    if (!jugador?.id || jugador.categoria_id !== undefined) return;
    const token = jugador.token;
    fetch(`/api/jugadores/${jugador.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setJugador(prev => ({
          ...prev,
          categoria_id: data.categoria_id ?? null,
          valor_numerico: data.valor_numerico ?? null,
        }));
      })
      .catch(() => {});
  }, [jugador?.id]);

  const value = useMemo(() => ({ jugador, setJugador }), [jugador]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
