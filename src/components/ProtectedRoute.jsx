// components/ProtectedRoute.jsx (ejemplo)
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="p-4">Cargando…</div>;
  return user ? children : <Navigate to="/login" replace />;
}
