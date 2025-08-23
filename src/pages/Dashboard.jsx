import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, doLogout } = useAuth();

  return (
    <div className="min-vh-100 bg-light">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8">
            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-body p-4 p-md-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h2 className="mb-0">
                    <i className="bi bi-speedometer2 me-2 text-primary"></i>
                    Dashboard
                  </h2>
                  <button
                    onClick={doLogout}
                    className="btn btn-outline-danger btn-sm"
                  >
                    <i className="bi bi-box-arrow-right me-1"></i>
                    Cerrar sesión
                  </button>
                </div>

                {user ? (
                  <>
                    <p className="text-muted mb-3">
                      Bienvenido, <span className="fw-semibold">{user.name}</span> 🎉
                    </p>

                    <table className="table table-bordered align-middle">
                      <tbody>
                        <tr>
                          <th scope="row" className="bg-light w-25">ID</th>
                          <td>{user.id}</td>
                        </tr>
                        <tr>
                          <th scope="row" className="bg-light">Nombre</th>
                          <td>{user.name}</td>
                        </tr>
                        <tr>
                          <th scope="row" className="bg-light">Email</th>
                          <td>{user.email}</td>
                        </tr>
                        <tr>
                          <th scope="row" className="bg-light">Creado</th>
                          <td>{new Date(user.created_at).toLocaleString('es-BO')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                ) : (
                  <div className="alert alert-warning mb-0">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    No hay datos de usuario cargados.
                  </div>
                )}
              </div>
            </div>

            <p className="text-center text-muted small mt-3 mb-0">
              © {new Date().getFullYear()} Planos — Panel de usuario
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
