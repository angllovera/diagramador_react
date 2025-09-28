import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDiagram } from "../context/DiagramContext";

function useOptionalDiagram() {
  let ctx = null;
  try { ctx = useDiagram(); } catch { ctx = null; }
  if (ctx && typeof ctx === "object") return { ...ctx, __absent: false };
  const noop = () => {};
  return {
    modelJson: "", setModelJson: noop,
    canUndo: false, canRedo: false, scale: 1,
    undo: noop, redo: noop, zoomIn: noop, zoomOut: noop,
    resetZoom: noop, zoomToFit: noop, setZoom: noop, toggleGrid: noop,
    printDiagram: noop,
    __absent: true,
  };
}

export default function Toolbar() {
  const {
    modelJson, setModelJson,
    canUndo, canRedo, scale,
    undo, redo, zoomToFit, setZoom, printDiagram,
    __absent,
  } = useOptionalDiagram();

  const { user, doLogout } = useAuth();
  const location = useLocation();
  const onDiagramPage = location.pathname.startsWith("/diagram") && !__absent;

  // === Admin detection (por rol o por email de ENV) ===
  const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "admin@admin.com").toLowerCase();
  const isAdmin = !!user && (
    (user.role && String(user.role).toLowerCase() === "admin") ||
    (user.email && String(user.email).toLowerCase() === ADMIN_EMAIL)
  );

  const [busy, setBusy] = useState({ xmi: false, spring: false, print: false, share: false });
  const fileRef = useRef(null);

  const apiBase = useMemo(
    () => (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, ""),
    []
  );

  const safeParse = (json) => { try { return { ok: true, value: JSON.parse(json) }; } catch (e) { return { ok: false, error: e }; } };
  const assertModel = () => {
    const p = safeParse(modelJson);
    if (!p.ok) { alert("El JSON del diagrama no es válido:\n" + (p.error?.message ?? "")); return null; }
    return p.value;
  };
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const hasModel = onDiagramPage && (modelJson?.trim()?.length ?? 0) > 0;

  function deepParseMaybe(jsonish) {
    let v = jsonish;
    try { if (typeof v === "string") v = JSON.parse(v); } catch {}
    try { if (typeof v === "string") v = JSON.parse(v); } catch {}
    return v;
  }
  function normalizeGoJsModel(obj) {
    const m = obj && typeof obj === "object" ? obj : {};
    if (!m.class || m.class === "GraphLinksModel") m.class = "go.GraphLinksModel";
    if (!m.nodeKeyProperty) m.nodeKeyProperty = "key";
    if (!m.linkKeyProperty) m.linkKeyProperty = "key";
    if (!m.linkCategoryProperty) m.linkCategoryProperty = "category";
    if (!Array.isArray(m.nodeDataArray)) m.nodeDataArray = [];
    if (!Array.isArray(m.linkDataArray)) m.linkDataArray = [];
    return m;
  }

  function downloadJSON() {
    if (!onDiagramPage) return;
    const obj = normalizeGoJsModel(deepParseMaybe(modelJson));
    const pretty = JSON.stringify(obj, null, 2);
    const blob = new Blob([pretty], { type: "application/json" });
    downloadBlob(blob, "diagram.json");
  }
  function loadJSON(e) {
    if (!onDiagramPage) return;
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const obj = normalizeGoJsModel(deepParseMaybe(String(r.result ?? "")));
      setModelJson(JSON.stringify(obj, null, 2));
    };
    r.readAsText(f);
    e.target.value = "";
  }

  async function exportXMI() {
    if (!onDiagramPage) return;
    const parsed = deepParseMaybe(modelJson);
    const model = normalizeGoJsModel(parsed);
    if (!model) return;
    try {
      setBusy((b) => ({ ...b, xmi: true }));
      const res = await fetch(`${apiBase}/api/export/xmi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      downloadBlob(blob, "diagram.xmi");
    } catch (err) {
      alert("Error al exportar XMI: " + err.message);
    } finally {
      setBusy((b) => ({ ...b, xmi: false }));
    }
  }

  async function generateSpring() {
    if (!onDiagramPage) return;
    const parsed = deepParseMaybe(modelJson);
    const model = normalizeGoJsModel(parsed);
    if (!model) return;

    const defArtifact = (user?.projectName || "app").toLowerCase().replace(/\s+/g, "");
    const artifactId = window.prompt("ArtifactId (nombre del proyecto Maven):", defArtifact) || defArtifact;
    const groupId = window.prompt("GroupId (paquete base Java):", "com.example") || "com.example";

    try {
      setBusy((b) => ({ ...b, spring: true }));
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/generate/springboot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ model, groupId, artifactId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      downloadBlob(blob, `${artifactId}-springboot.zip`);
    } catch (err) {
      alert("Error al generar Spring Boot: " + (err.message || err));
    } finally {
      setBusy((b) => ({ ...b, spring: false }));
    }
  }

  async function shareLink() {
    if (!onDiagramPage) return;
    const u = new URL(window.location.href);
    let diagramId = u.searchParams.get("id");
    if (!diagramId) {
      const m = u.pathname.match(/^\/diagram\/([^/?#]+)/);
      if (m) diagramId = decodeURIComponent(m[1]);
    }
    if (!diagramId) return alert("No encuentro el id del diagrama en la URL (/diagram/:id o ?id=...)");

    const perm = (window.prompt("Permiso (view/edit):", "edit") || "edit").toLowerCase() === "view" ? "view" : "edit";
    const ttl = Number(window.prompt("Vence en horas (ej. 168 = 7 días):", "168")) || 168;

    try {
      setBusy((b) => ({ ...b, share: true }));
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/diagrams/${diagramId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ permission: perm, ttlHours: ttl }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      await navigator.clipboard.writeText(data.url);
      alert("🔗 Enlace de compartir copiado al portapapeles");
    } catch (e) {
      alert("No se pudo generar el enlace: " + (e.message || e));
    } finally {
      setBusy((b) => ({ ...b, share: false }));
    }
  }

  const doPrint = async () => {
    if (!onDiagramPage) return;
    try {
      setBusy((b) => ({ ...b, print: true }));
      await printDiagram();
    } finally {
      setBusy((b) => ({ ...b, print: false }));
    }
  };

  useEffect(() => {
    if (!onDiagramPage) return;
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        e.stopPropagation();
        doPrint();
        return;
      }
      if (!mod) return;
      const hit = () => { e.preventDefault(); e.stopPropagation(); };
      if (e.key.toLowerCase() === "z" && !e.shiftKey) { hit(); undo(); }
      else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") { hit(); redo(); }
      else if (e.key.toLowerCase() === "s") { hit(); downloadJSON(); }
      else if (e.key.toLowerCase() === "o") { hit(); fileRef.current?.click(); }
      else if (e.key.toLowerCase() === "e") { hit(); exportXMI(); }
      else if (e.key.toLowerCase() === "g") { hit(); generateSpring(); }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onDiagramPage, undo, redo]);

  const pct = Math.round((scale || 1) * 100);

  return (
    <>
      <style>{`
        .tb { position: sticky; top: 0; z-index: 1030; display:flex; flex-wrap:wrap; align-items:center; gap:.5rem; padding:.5rem .75rem; background:#f8fafc; border-bottom:1px solid #e5e7eb; }
        .tb .grp { display:flex; align-items:center; gap:.25rem; padding:.25rem; border:1px solid #e5e7eb; border-radius:.5rem; background:#fff; }
        .tb .btn { padding:.25rem .5rem; font-size:.875rem; }
        .tb .push { flex: 1 1 auto; }
        .tb .userchip { display:flex; align-items:center; gap:.375rem; padding:.25rem .5rem; border-radius:.5rem; background:#ffffff; border:1px solid #e5e7eb; font-size:.875rem; }
      `}</style>

      <div className="tb">
        {onDiagramPage && (
          <>
            <div className="grp" aria-label="Navegación">
              <button className="btn btn-outline-secondary" title="Atrás" onClick={undo} disabled={!canUndo}>⟲</button>
              <button className="btn btn-outline-secondary" title="Adelante" onClick={redo} disabled={!canRedo}>⟳</button>
              <button className="btn btn-outline-secondary" title="Ajustar al contenido" onClick={zoomToFit}>⤢</button>
              <select className="form-select form-select-sm ms-1" value={pct} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: 90 }} title="Zoom rápido">
                {[50, 75, 100, 125, 150, 200].map((v) => (<option key={v} value={v}>{v}%</option>))}
              </select>
            </div>

            <div className="grp" aria-label="Compartir">
              <button className="btn btn-outline-primary" onClick={shareLink} disabled={!hasModel || busy.share}>
                {busy.share ? "Generando..." : "Compartir"}
              </button>
            </div>

            <div className="grp" aria-label="Archivo">
              <button className="btn btn-primary" onClick={downloadJSON} disabled={!hasModel || busy.xmi || busy.spring || busy.print}>Guardar JSON</button>
              <input ref={fileRef} type="file" accept="application/json" className="d-none" onChange={loadJSON} />
              <button className="btn btn-outline-primary" onClick={() => fileRef.current?.click()} disabled={busy.xmi || busy.spring || busy.print}>Cargar JSON</button>
            </div>

            <div className="grp" aria-label="Exportación">
              <button className="btn btn-outline-dark" onClick={exportXMI} disabled={!hasModel || busy.xmi}>{busy.xmi ? "Exportando…" : "Exportar XMI"}</button>
              <button className="btn btn-outline-dark" onClick={generateSpring} disabled={!hasModel || busy.spring}>{busy.spring ? "Generando…" : "Generar Spring Boot"}</button>
            </div>

            <div className="grp" aria-label="Impresión">
              <button className="btn btn-outline-success" onClick={doPrint} disabled={!hasModel || busy.print} title="Ctrl/Cmd + P">
                {busy.print ? "Preparando…" : "Imprimir"}
              </button>
            </div>
          </>
        )}

        <div className="push" />

        {user && (
          <div className="grp" aria-label="App">
            <NavLink className="btn btn-link text-decoration-none" to="/">Dashboard</NavLink>

            {/* 👇 Ocultar 'Usuarios' si no es admin */}
            {isAdmin && (
              <NavLink className="btn btn-link text-decoration-none" to="/users">Usuarios</NavLink>
            )}

            {/* Chip con icono + nombre del usuario actual */}
            <span className="userchip" title={user.name || "Usuario"}>
              <i className="bi bi-person-circle" aria-hidden="true" />
              <span style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.name || "Usuario"}
              </span>
            </span>

            <button className="btn btn-outline-danger btn-sm" onClick={doLogout}>
              <i className="bi bi-box-arrow-right me-1" /> Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </>
  );
}
