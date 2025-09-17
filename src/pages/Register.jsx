import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function isEmailValid(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function Register() {
  const { doRegister } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const errors = useMemo(() => {
    const e = {};
    if (name.trim().length < 2) e.name = 'Mínimo 2 caracteres.';
    if (!isEmailValid(email.trim())) e.email = 'Ingresa un email válido.';
    if (password.length < 8) e.password = 'Mínimo 8 caracteres.';
    return e;
  }, [name, email, password]);

  const formInvalid = Object.keys(errors).length > 0;

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('');
    if (formInvalid) return;

    setLoading(true);
    try {
      await doRegister(name.trim(), email.trim().toLowerCase(), password);
      // éxito → redirigir al login
      navigate('/login', { replace: true, state: { justRegistered: true } });
    } catch (err) {
      const apiMsg =
        err?.response?.data?.error ||
        err?.message ||
        'Error de registro';
      setMsg(apiMsg);
    } finally {
      setLoading(false);
    }
  }

  const isError = !!msg;

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
                  <p className="text-muted small mb-0">
                    Ingresa tus datos para registrarte
                  </p>
                </div>

                <form onSubmit={onSubmit} noValidate>
                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      required
                      minLength={2}
                    />
                    {errors.name && (
                      <div className="invalid-feedback">{errors.name}</div>
                    )}
                  </div>

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
                        minLength={8}
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
                        Creando cuenta...
                      </>
                    ) : 'Crear cuenta'}
                  </button>
                </form>

                {isError && (
                  <div className="alert alert-danger mt-3 mb-0" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {msg}
                  </div>
                )}

                <p className="text-center small text-muted mt-3 mb-0">
                  ¿Ya tienes cuenta?{' '}
                  <a href="/login" className="text-decoration-none">Inicia sesión</a>
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
