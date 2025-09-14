import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { DiagramProvider } from "./context/DiagramContext";
import Toolbar from "./components/Toolbar";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Diagram from "./pages/Diagram";

function PublicOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="text-center mt-5">Cargando...</p>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

// Puente para URLs antiguas /diagram?pid=XYZ
function RedirectLegacyDiagram() {
  const loc = useLocation();
  const pid = new URLSearchParams(loc.search).get("pid");
  return pid ? (
    <Navigate to={`/diagram/${pid}`} replace />
  ) : (
    <Navigate to="/" replace />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <DiagramProvider>
          <Toolbar />
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <Login />
                </PublicOnly>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnly>
                  <Register />
                </PublicOnly>
              }
            />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* puente legacy */}
            <Route
              path="/diagram"
              element={
                <ProtectedRoute>
                  <RedirectLegacyDiagram />
                </ProtectedRoute>
              }
            />

            {/* ✅ ruta correcta */}
            <Route
              path="/diagram/:id"
              element={
                <ProtectedRoute>
                  <Diagram />
                </ProtectedRoute>
              }
            />

            <Route
              path="*"
              element={
                <div className="container py-5">
                  <h3>Página no encontrada</h3>
                </div>
              }
            />
          </Routes>
        </DiagramProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
