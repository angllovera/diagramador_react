// src/pages/Users.jsx
import { useEffect, useRef, useState } from "react";
import { listUsers, deleteUser, createUser, getUser, updateUser } from "../api/users";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---- Modal (create/edit)
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // "create" | "edit"
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ id: null, name: "", email: "", password: "" });
  const [formErr, setFormErr] = useState("");
  const nameInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listUsers();
      setUsers(data.items || []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ---- Delete
  const onDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;
    try {
      await deleteUser(id);
      load();
    } catch (e) {
      alert("Error eliminando: " + (e.message || e));
    }
  };

  // ---- Modal helpers
  const focusSoon = () => setTimeout(() => nameInputRef.current?.focus(), 50);

  const openCreate = () => {
    setMode("create");
    setForm({ id: null, name: "", email: "", password: "" });
    setFormErr("");
    setOpen(true);
    focusSoon();
  };

  const openEdit = async (id) => {
    setMode("edit");
    setFormErr("");
    setOpen(true);
    try {
      const u = await getUser(id);
      setForm({ id: u.id, name: u.name || "", email: u.email || "", password: "" });
      focusSoon();
    } catch (e) {
      setFormErr("No se pudo cargar el usuario: " + (e.message || e));
    }
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
  };

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.name || form.name.trim().length < 3) return "Nombre debe tener al menos 3 caracteres";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Email inválido";
    if (mode === "create") {
      if (!form.password || form.password.length < 8) return "Password debe tener al menos 8 caracteres";
    } else if (mode === "edit" && form.password && form.password.length < 8) {
      return "Si cambias el password, debe tener al menos 8 caracteres";
    }
    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setFormErr(v); return; }
    setFormErr("");
    setSaving(true);
    try {
      if (mode === "create") {
        await createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
      } else {
        const payload = { name: form.name.trim(), email: form.email.trim() };
        if (form.password) payload.password = form.password;
        await updateUser(form.id, payload);
      }
      setOpen(false);
      setForm({ id: null, name: "", email: "", password: "" });
      load();
    } catch (e2) {
      setFormErr(String(e2.message || e2));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-3">
      <style>{`
        .modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; z-index:1050; }
        .modal-card { width: 100%; max-width: 520px; background:#fff; border-radius:.75rem; box-shadow: 0 15px 30px rgba(0,0,0,.2); }
        .modal-header { padding:.75rem 1rem; border-bottom:1px solid #e5e7eb; display:flex; align-items:center; }
        .modal-body { padding:1rem; }
        .modal-footer { padding:.75rem 1rem; border-top:1px solid #e5e7eb; display:flex; gap:.5rem; justify-content:flex-end; }
      `}</style>

      <div className="d-flex align-items-center mb-3">
        <h3 className="me-auto">Usuarios</h3>
        <button className="btn btn-primary" onClick={openCreate}>Nuevo</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-responsive">
        <table className="table table-bordered table-sm align-middle">
          <thead className="table-light">
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Creado</th>
              <th style={{ width: 160 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4}>Cargando…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4}>No hay usuarios</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{new Date(u.created_at).toLocaleString()}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(u.id)}>
                      Editar
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(u.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ------ Modal Crear/Editar ------ */}
      {open && (
        <div className="modal-mask" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <h5 className="mb-0">{mode === "create" ? "Nuevo usuario" : "Editar usuario"}</h5>
              <button type="button" className="btn btn-sm btn-light ms-auto" onClick={closeModal} disabled={saving}>
                ✕
              </button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-body">
                {formErr && <div className="alert alert-danger py-2">{formErr}</div>}

                <div className="mb-3">
                  <label className="form-label">Nombre</label>
                  <input
                    ref={nameInputRef}
                    name="name"
                    className="form-control"
                    value={form.name}
                    onChange={onChange}
                    minLength={3}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    name="email"
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={onChange}
                    required
                  />
                </div>

                <div className="mb-0">
                  <label className="form-label">
                    {mode === "create" ? "Password" : "Nuevo password (opcional)"}
                  </label>
                  <input
                    name="password"
                    type="password"
                    className="form-control"
                    value={form.password}
                    onChange={onChange}
                    placeholder={mode === "edit" ? "Dejar vacío para no cambiar" : ""}
                    {...(mode === "create" ? { required: true, minLength: 8 } : {})}
                  />
                  <div className="form-text">Mínimo 8 caracteres.</div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={closeModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Guardando…" : (mode === "create" ? "Crear" : "Guardar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
