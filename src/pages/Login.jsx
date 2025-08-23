import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { doLogin } = useAuth();
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('password');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      await doLogin(email, password);
      setMsg('¡Sesión iniciada!');
    } catch (e) {
      setMsg(e.message || 'Error de login');
    } finally {
      setLoading(false);
    }
  }

  const isError = msg && !msg.includes('iniciada');

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-5">
            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <i className="bi bi-shield-lock-fill fs-1 text-primary"></i>
                  <h2 className="mt-2 mb-0">Iniciar sesión</h2>
                  <p className="text-muted small mb-0">Accede con tus credenciales</p>
                </div>

                <form onSubmit={onSubmit} className="needs-validation" noValidate>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e)=>setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                    />
                    <div className="invalid-feedback">Ingresa un email válido.</div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label">Contraseña</label>
                    <input
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(e)=>setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <div className="invalid-feedback">Ingresa tu contraseña.</div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="remember"/>
                      <label className="form-check-label small" htmlFor="remember">
                        Recordarme
                      </label>
                    </div>
                    {/* Puedes enlazar a /register si ya lo tienes */}
                    {/* <a className="small" href="/register">Crear cuenta</a> */}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Entrando...
                      </>
                    ) : 'Entrar'}
                  </button>
                </form>

                {msg && (
                  <div className={`alert mt-3 mb-0 ${isError ? 'alert-danger' : 'alert-success'}`} role="alert">
                    {isError ? <i className="bi bi-exclamation-triangle-fill me-2"></i> : <i className="bi bi-check-circle-fill me-2"></i>}
                    {msg}
                  </div>
                )}
              </div>
            </div>

            <p className="text-center text-muted small mt-3 mb-0">
              © {new Date().getFullYear()} Planos — Seguridad primero
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
