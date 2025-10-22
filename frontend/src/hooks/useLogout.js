// src/hooks/useLogout.js
import { useNavigate } from "react-router-dom";

export default function useLogout() {
  const navigate = useNavigate();

  return () => {
    // limpiá lo que uses para sesión
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // si usás context: setUser(null) acá
    navigate("/");
  };
}
