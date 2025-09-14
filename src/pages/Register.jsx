import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { doRegister } = useAuth();
  const [name, setName] = useState('Angel Lovera');
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('password');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      await doRegister(name, email, password);
      setMsg('¡Registrado y logueado!');
    } catch (e) {
      setMsg(e.message || 'Error de registro');
    } finally {
      setLoading(false);
    }
  }

  const isError = msg && !msg.includes('Registrado');

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-5">
            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <i className="bi bi-person-plus-fill fs-1 text-primary"></i>
                  <h2 className="mt-2 mb-0">Crear cuenta</h2>
                  <p className="text-muted small mb-0">Ingresa tus datos para registrarte</p>
                </div>

                <form onSubmit={onSubmit} noValidate className="needs-validation">
                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      required
                      minLength={2}
                    />
                    <div className="invalid-feedback">Ingresa tu nombre.</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                    />
                    <div className="invalid-feedback">Ingresa un email válido.</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Contraseña</label>
                    <input
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <div className="invalid-feedback">Mínimo 6 caracteres.</div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creando cuenta...
                      </>
                    ) : 'Crear cuenta'}
                  </button>
                </form>

                {msg && (
                  <div className={`alert mt-3 mb-0 ${isError ? 'alert-danger' : 'alert-success'}`} role="alert">
                    {isError ? <i className="bi bi-exclamation-triangle-fill me-2"></i> : <i className="bi bi-check-circle-fill me-2"></i>}
                    {msg}
                  </div>
                )}

                <p className="text-center small text-muted mt-3 mb-0">
                  ¿Ya tienes cuenta? <a href="/login" className="text-decoration-none">Inicia sesión</a>
                </p>
              </div>
            </div>

            <p className="text-center text-muted small mt-3 mb-0">
              © {new Date().getFullYear()} Diagramas — Seguridad primero
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
