import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

// Solo permite acceder si NO estás logueado (redirige al dashboard si ya hay sesión)
function PublicOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="text-center mt-5">Cargando...</p>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function Navbar() {
  const { user, doLogout } = useAuth();

  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom">
      <div className="container">
        <NavLink className="navbar-brand fw-semibold" to="/">Planos</NavLink>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMain">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navMain">
          <ul className="navbar-nav ms-auto">
            {!user && (
              <>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/login">Login</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/register">Register</NavLink>
                </li>
              </>
            )}
            {user && (
              <>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/">Dashboard</NavLink>
                </li>
                <li className="nav-item">
                  <button className="btn btn-outline-danger btn-sm ms-lg-3" onClick={doLogout}>
                    <i className="bi bi-box-arrow-right me-1"></i> Cerrar sesión
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
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
          {/* 404 */}
          <Route path="*" element={<div className="container py-5"><h3>Página no encontrada</h3></div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

