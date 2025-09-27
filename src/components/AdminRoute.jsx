// src/components/AdminRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, ready } = useAuth();

  if (!ready) return <p className="text-center mt-5">Cargando...</p>;
  if (!user) return <Navigate to="/login" replace />;

  // 👇 Solo el admin declarado
  if (user.email !== "admin@admin.com") {
    return (
      <div className="container py-5">
        <h3>No tienes permisos para acceder a esta página</h3>
      </div>
    );
  }
  return children;
}
