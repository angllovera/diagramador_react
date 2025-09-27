import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as Projects from "../api/projects";
import * as Diagrams from "../api/diagrams";

function UMLIcon({ size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="uml-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f8fbff" />
          <stop offset="1" stopColor="#eef3ff" />
        </linearGradient>
        <linearGradient id="uml-head" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#84a9ff" />
          <stop offset="1" stopColor="#6a92ff" />
        </linearGradient>
      </defs>
      <rect x="8" y="12" width="48" height="40" rx="6" fill="url(#uml-body)" stroke="#dbe4ff" />
      <rect x="8" y="12" width="48" height="12" rx="6" fill="url(#uml-head)" />
      <line x1="12" y1="30" x2="52" y2="30" stroke="#d0d7ed" />
      <line x1="12" y1="40" x2="52" y2="40" stroke="#d0d7ed" />
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem("diagramas.projects");
  }, []);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  async function load() {
    setLoading(true);
    setLoadErr("");
    try {
      const list = await Projects.listProjects();
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("ERROR /projects:", e);
      setLoadErr(e?.message || "No se pudo cargar proyectos");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const ordered = useMemo(() => {
    const toDate = (p) => new Date(p.updatedAt || p.updated_at || p.createdAt || p.created_at || 0);
    return [...items].sort((a, b) => toDate(b) - toDate(a));
  }, [items]);

  async function openDiagram(projectId) {
    try {
      if (typeof Diagrams.listProjectDiagrams !== "function") {
        throw new Error("Falta exportar listProjectDiagrams en src/api/diagrams.js");
      }
      const diags = await Diagrams.listProjectDiagrams(projectId);
      if (Array.isArray(diags) && diags.length) {
        return navigate(`/diagram/${diags[0].id}`);
      }
      const d = await Diagrams.createDiagram({
        projectId,
        name: "Diagrama Principal",
        kind: "class",
        modelJson: { class: "go.GraphLinksModel", nodeDataArray: [], linkDataArray: [] },
      });
      navigate(`/diagram/${d.id}`);
    } catch (e) {
      console.error("ERROR openDiagram:", e);
      alert(e?.message || "No se pudo abrir/crear el diagrama");
    }
  }

  async function deleteProject(projectId) {
    try {
      const p = items.find((x) => x.id === projectId);
      if (!p) return;
      if (!confirm(`¿Eliminar proyecto "${p.name}"?`)) return;
      await Projects.deleteProject(projectId);
      await load();
    } catch (e) {
      console.error("ERROR deleteProject:", e);
      alert(e?.message || "No se pudo eliminar el proyecto");
    }
  }

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function createEmpty(e) {
    e?.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const project = await Projects.createProject({ name: name.trim(), description: null });
      const d = await Diagrams.createDiagram({
        projectId: project.id,
        name: "Diagrama Principal",
        kind: "class",
        modelJson: { class: "go.GraphLinksModel", nodeDataArray: [], linkDataArray: [] },
      });
      navigate(`/diagram/${d.id}`);
    } catch (e) {
      console.error("ERROR createEmpty:", e);
      alert(e?.message || "No se pudo crear el proyecto/diagrama");
    } finally {
      setCreating(false);
      setCreateOpen(false);
      await load();
    }
  }

  // Dropzone / importar
  const [dragOver, setDragOver] = useState(false);
  const [filePicked, setFilePicked] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const inputRef = useRef(null);

  const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, "");
  const ACCEPT = ".sql,.sqlite,.db,.csv,.zip,.json,.xlsx,.xml";

  function onDragOver(e) { e.preventDefault(); setDragOver(true); }
  function onDragLeave() { setDragOver(false); }
  function onDrop(e) { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) { setImportMsg(""); setFilePicked(f); } }
  function onPick(e) { const f = e.target.files?.[0]; if (f) { setImportMsg(""); setFilePicked(f); } e.target.value = ""; }

  function baseName(n) { const dot = n.lastIndexOf("."); return dot > 0 ? n.slice(0, dot) : n; }
  function isJsonFile(f) {
    const name = (f?.name || "").toLowerCase();
    return name.endsWith(".json") || (f?.type || "").includes("json");
  }
  function readText(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = reject;
      fr.readAsText(file);
    });
  }
  function ensureGojsModel(obj) {
    let model = obj;

    if (model && typeof model === "object" && "modelJson" in model) {
      const raw = model.modelJson;
      try { model = typeof raw === "string" ? JSON.parse(raw) : raw || {}; }
      catch { model = raw || {}; }
    }
    if (typeof model === "string") {
      try { model = JSON.parse(model); } catch { model = {}; }
    }

    if (!model || typeof model !== "object") model = {};
    if (!model.class || model.class === "GraphLinksModel") model.class = "go.GraphLinksModel";
    if (!Array.isArray(model.nodeDataArray)) model.nodeDataArray = [];
    if (!Array.isArray(model.linkDataArray)) model.linkDataArray = [];
    if (!model.nodeKeyProperty) model.nodeKeyProperty = "key";
    if (!model.linkKeyProperty) model.linkKeyProperty = "key";
    if (!model.linkCategoryProperty) model.linkCategoryProperty = "category";

    for (const n of model.nodeDataArray) {
      if (!n.loc && (n.position || n.location)) {
        const p = n.position || n.location;
        if (typeof p === "string") n.loc = p;
        else if (p && typeof p.x === "number" && typeof p.y === "number") n.loc = `${p.x} ${p.y}`;
      }
    }
    return model;
  }

  async function createFromJsonFile(file) {
    const txt = await readText(file);
    let parsed;
    try { parsed = JSON.parse(txt); } catch { parsed = txt; }
    const model = ensureGojsModel(parsed);

    const dtoName =
      (parsed && typeof parsed === "object" && (parsed.name || parsed.projectName || parsed.title)) ||
      baseName(file.name);

    const project = await Projects.createProject({ name: String(dtoName).trim() || baseName(file.name) });
    const d = await Diagrams.createDiagram({
      projectId: project.id,
      name: (parsed && parsed.diagramName) || "Importado",
      kind: (parsed && parsed.kind) || "class",
      modelJson: model, // si tu API necesita string: JSON.stringify(model)
    });
    return d;
  }

  async function createFromFile() {
    if (!filePicked) return;
    setImporting(true);
    setImportMsg("");
    try {
      // 1) JSON local directo al lienzo (y persistido)
      if (isJsonFile(filePicked)) {
        const d = await createFromJsonFile(filePicked);
        setImporting(false); setFilePicked(null);
        await load();
        return navigate(`/diagram/${d.id}`);
      }

      // 2) Otros tipos → backend /api/import/db
      const fd = new FormData();
      fd.append("file", filePicked);
      const res = await fetch(`${apiBase}/api/import/db`, { method: "POST", body: fd, credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const project = await Projects.createProject({ name: data?.name?.trim() || baseName(filePicked.name) });
        const model = ensureGojsModel(data?.modelJson ?? {});
        const d = await Diagrams.createDiagram({
          projectId: project.id,
          name: data?.diagramName || "Importado",
          kind: data?.kind || "class",
          modelJson: model,
        });
        setImporting(false); setFilePicked(null);
        await load();
        return navigate(`/diagram/${d.id}`);
      }
      setImportMsg("No se pudo procesar el archivo en el backend. Crearé vacío.");
    } catch (err) {
      console.warn("Fallo al usar backend, haré fallback:", err);
      setImportMsg("No se pudo contactar al backend. Crearé vacío.");
    }

    // 3) Fallback vacío
    try {
      const project = await Projects.createProject({ name: baseName(filePicked.name) });
      const d = await Diagrams.createDiagram({
        projectId: project.id,
        name: "Importado (local)",
        kind: "class",
        modelJson: { class: "go.GraphLinksModel", nodeDataArray: [], linkDataArray: [] },
      });
      setImporting(false); setFilePicked(null);
      await load();
      navigate(`/diagram/${d.id}`);
    } catch (e) {
      console.error("ERROR createFromFile fallback:", e);
      setImporting(false);
      alert("No se pudo crear el proyecto/diagrama.");
    }
  }

  return (
    <div className="min-vh-100 bg-light">
      <style>{`
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
        .card-diag { border: 1px solid #eef0f3; border-radius: .9rem; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.03); transition: box-shadow .15s ease, transform .05s ease; display: flex; flex-direction: column; height: 260px; padding: 1rem; }
        .card-diag:hover { box-shadow: 0 6px 18px rgba(0,0,0,.06); transform: translateY(-1px); }
        .thumb { flex: 0 0 140px; border-radius: .7rem; background: #f3f6f9; display:flex; align-items:center; justify-content:center; margin-bottom: .75rem; }
        .title { font-weight: 600; }
        .actions { margin-top: auto; display:flex; gap:.5rem; }
        .new-card { border: 2px dashed #bcd2f7; background: #f8fbff; color:#3b82f6; outline: none; }
        .new-card:hover { border-color: #6aa6f8; box-shadow: 0 0 0 3px rgba(106,166,248,.2); }
        .dz-card { border: 2px dashed #9ec1ff; background:#f7fbff; cursor: pointer; }
        .dz-card.hover { border-color:#5c9cff; box-shadow: 0 0 0 3px rgba(92,156,255,.18); }
        .dz-thumb { background:#f0f6ff; }
        .dz-file { font-size:.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      `}</style>

      <div className="container py-4">
        <h3 className="mb-3">Mis Diagramas de Clase</h3>

        {loadErr && (
          <div className="alert alert-warning py-2">
            {loadErr}
            <button className="btn btn-sm btn-link ms-2" onClick={load}>Reintentar</button>
          </div>
        )}

        <div className="grid">
          {/* Dropzone */}
          <div
            className={`card-diag dz-card ${dragOver ? "hover" : ""}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !importing && inputRef.current?.click()}
            role="button"
            title="Arrastra tu archivo o haz clic para seleccionar"
          >
            <div className="thumb dz-thumb">
              <i className="bi bi-folder-fill" style={{ fontSize: 36, color: "#f59e0b" }} />
            </div>

            <div className="title">{filePicked ? "Archivo seleccionado" : "Importar BD"}</div>

            <div className="actions">
              {!filePicked ? (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                    disabled={importing}
                  >
                    Seleccionar Archivo
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    className="d-none"
                    accept={ACCEPT}
                    onChange={onPick}
                  />
                </>
              ) : (
                <>
                  <span className="dz-file flex-grow-1 align-self-center">{filePicked.name}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={(e) => { e.stopPropagation(); createFromFile(); }}
                    disabled={importing}
                  >
                    {importing ? "Procesando..." : "Crear"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={(e) => { e.stopPropagation(); setFilePicked(null); }}
                    disabled={importing}
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
            {importMsg && <small className="text-muted mt-2">{importMsg}</small>}
          </div>

          {/* Nuevo diagrama vacío */}
          <button
            className="card-diag new-card text-start"
            onClick={() => setCreateOpen(true)}
            disabled={loading}
          >
            <div className="thumb d-flex align-items-center justify-content-center">
              <i className="bi bi-plus-lg" style={{ fontSize: 28 }} />
            </div>
            <div className="title">Nuevo Diagrama</div>
          </button>

          {/* Proyectos existentes */}
          {loading ? (
            <div className="card-diag d-flex align-items-center justify-content-center">
              Cargando proyectos…
            </div>
          ) : ordered.length === 0 ? (
            <div className="card-diag d-flex align-items-center justify-content-center">
              No hay proyectos aún.
            </div>
          ) : (
            ordered.map((p) => {
              const when = new Date(p.updatedAt || p.updated_at || p.createdAt || p.created_at || Date.now()).toLocaleString("es-BO");
              return (
                <div key={p.id} className="card-diag" title={when}>
                  <div className="thumb d-flex align-items-center justify-content-center"><UMLIcon /></div>
                  <div className="title">{p.name}</div>
                  <div className="actions">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => openDiagram(p.id)}>
                      <i className="bi bi-box-arrow-in-right me-1" /> Abrir
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => deleteProject(p.id)}>
                      <i className="bi bi-trash me-1" /> Eliminar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal crear vacío */}
        {createOpen && (
          <div className="position-fixed top-0 start-0 w-100 h-100" style={{ background: "rgba(17,24,39,.35)", zIndex: 1080 }} role="dialog" aria-modal="true">
            <div className="d-flex align-items-center justify-content-center h-100 p-3">
              <form className="card shadow border-0 rounded-4" style={{ maxWidth: 420, width: "100%" }} onSubmit={createEmpty}>
                <div className="card-body p-4">
                  <h5 className="mb-3">Nuevo diagrama de clase</h5>
                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input
                      autoFocus
                      className="form-control"
                      placeholder="p. ej., Dominio Ventas"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={!name.trim() || creating}>
                      {creating ? "Creando..." : "Crear"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        <p className="text-center text-muted small mt-4 mb-0">
          © {new Date().getFullYear()} Diagramas — Panel de Proyectos
        </p>
      </div>
    </div>
  );
}
