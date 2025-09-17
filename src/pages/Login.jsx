// src/pages/Login.jsx
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

function isEmailValid(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function Login() {
  const { doLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const [flash, setFlash] = useState('');   // mensaje verde (éxito post-registro)
  const [msg, setMsg] = useState('');       // mensaje de error
  const [loading, setLoading] = useState(false);

  // Si venimos de Register con state.justRegistered, mostrar aviso y limpiar el state
  useEffect(() => {
    if (location.state?.justRegistered) {
      setFlash('✅ Tu cuenta fue creada con éxito. Ahora inicia sesión.');
      // Limpia el state para que el aviso no aparezca al refrescar
      navigate(location.pathname, { replace: true, state: {} });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo al montar

  const errors = useMemo(() => {
    const e = {};
    if (!isEmailValid(email.trim())) e.email = 'Ingresa un email válido.';
    if (password.length < 1) e.password = 'Ingresa tu contraseña.';
    return e;
  }, [email, password]);

  const formInvalid = Object.keys(errors).length > 0;

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('');
    setFlash('');
    if (formInvalid) return;

    setLoading(true);
    try {
      await doLogin(email.trim().toLowerCase(), password);
      // Éxito → redirigir a home (o donde prefieras)
      navigate('/', { replace: true });
    } catch (err) {
      const apiMsg =
        err?.response?.data?.error ||
        err?.message ||
        'Credenciales inválidas.';
      setMsg(apiMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-5">
            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <i className="bi bi-box-arrow-in-right fs-1 text-primary"></i>
                  <h2 className="mt-2 mb-0">Iniciar sesión</h2>
                  <p className="text-muted small mb-0">Accede con tu cuenta</p>
                </div>

                {/* Aviso de éxito al venir de Register */}
                {flash && (
                  <div className="alert alert-success d-flex align-items-center" role="alert">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    {flash}
                  </div>
                )}

                {/* Error de login */}
                {msg && (
                  <div className="alert alert-danger d-flex align-items-center" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {msg}
                  </div>
                )}

                <form onSubmit={onSubmit} noValidate>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                    />
                    {errors.email && (
                      <div className="invalid-feedback">{errors.email}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Contraseña</label>
                    <div className="input-group">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPwd(s => !s)}
                        tabIndex={-1}
                      >
                        <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`} />
                      </button>
                      {errors.password && (
                        <div className="invalid-feedback d-block">{errors.password}</div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading || formInvalid}
                    title={formInvalid ? 'Completa los campos correctamente' : undefined}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        Ingresando...
                      </>
                    ) : 'Iniciar sesión'}
                  </button>
                </form>

                <p className="text-center small text-muted mt-3 mb-0">
                  ¿No tienes cuenta? <a href="/register" className="text-decoration-none">Crea una</a>
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
