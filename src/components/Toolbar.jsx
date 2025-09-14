// src/components/Toolbar.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDiagram } from "../context/DiagramContext";

// Hook seguro: funciona con o sin provider (Dashboard)
function useOptionalDiagram() {
  let ctx = null;
  try {
    ctx = useDiagram();
  } catch {
    ctx = null;
  }
  if (ctx && typeof ctx === "object") return { ...ctx, __absent: false };

  const noop = () => {};
  return {
    modelJson: "",
    setModelJson: noop,
    canUndo: false,
    canRedo: false,
    scale: 1,
    undo: noop,
    redo: noop,
    zoomIn: noop,
    zoomOut: noop,
    resetZoom: noop,
    zoomToFit: noop,
    setZoom: noop,
    toggleGrid: noop,
    __absent: true,
  };
}

export default function Toolbar() {
  const {
    modelJson,
    setModelJson,
    canUndo,
    canRedo,
    scale,
    undo,
    redo,
    zoomToFit,
    setZoom,
    __absent,
  } = useOptionalDiagram();

  const { user, doLogout } = useAuth();
  const location = useLocation();
  const onDiagramPage = location.pathname.startsWith("/diagram") && !__absent;

  const [busy, setBusy] = useState({
    xmi: false,
    spring: false,
    ai: false,
    share: false,
  });
  const fileRef = useRef(null);

  const apiBase = useMemo(
    () =>
      (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(
        /\/+$/,
        ""
      ),
    []
  );

  // Helpers
  const safeParse = (json) => {
    try {
      return { ok: true, value: JSON.parse(json) };
    } catch (e) {
      return { ok: false, error: e };
    }
  };
  const assertModel = () => {
    const p = safeParse(modelJson);
    if (!p.ok) {
      alert("El JSON del diagrama no es válido:\n" + (p.error?.message ?? ""));
      return null;
    }
    return p.value;
  };
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: filename,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Archivo
  const hasModel = onDiagramPage && (modelJson?.trim()?.length ?? 0) > 0;

  // Intenta parsear hasta 2 veces (por si viene doble-encoded)
  function deepParseMaybe(jsonish) {
    let v = jsonish;
    try {
      if (typeof v === "string") v = JSON.parse(v);
    } catch {}
    try {
      if (typeof v === "string") v = JSON.parse(v);
    } catch {}
    return v;
  }

  // Normaliza para GoJS: class, props y arrays mínimos
  function normalizeGoJsModel(obj) {
    const m = obj && typeof obj === "object" ? obj : {};
    if (!m.class || m.class === "GraphLinksModel")
      m.class = "go.GraphLinksModel";
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
      window.dispatchEvent(
        new CustomEvent("diagram:load-json", { detail: obj })
      );
    };
    r.readAsText(f);
    e.target.value = "";
  }

  // Export / Generate / IA / Share
  async function exportXMI() {
    if (!onDiagramPage) return;
    const model = assertModel();
    if (!model) return;
    try {
      setBusy((b) => ({ ...b, xmi: true }));
      const res = await fetch(`${apiBase}/export/xmi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(model),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      downloadBlob(blob, "model.xmi");
    } catch (err) {
      alert("Error al exportar XMI: " + err.message);
    } finally {
      setBusy((b) => ({ ...b, xmi: false }));
    }
  }

  async function generateSpring() {
    if (!onDiagramPage) return;
    const model = assertModel();
    if (!model) return;
    const entities = (model.nodeDataArray || [])
      .filter((n) => n.category === "class")
      .map((c) => ({
        name: c.name,
        fields: (c.attributes || []).map((a) => ({
          name: a.name,
          type: a.type,
          nullable: !!a.nullable,
          unique: !!a.unique,
        })),
      }));
    const payload = {
      basePkg: "com.acme.generated",
      groupId: "com.acme",
      artifactId: "diagram-api",
      entities,
      options: { openapi: true },
    };

    try {
      setBusy((b) => ({ ...b, spring: true }));
      const res = await fetch(`${apiBase}/generate/spring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      downloadBlob(blob, "spring-backend.zip");
    } catch (err) {
      alert("Error al generar Spring: " + err.message);
    } finally {
      setBusy((b) => ({ ...b, spring: false }));
    }
  }

  async function suggestAI() {
    if (!onDiagramPage) return;
    const model = assertModel();
    if (!model) return;
    const firstClass = (model.nodeDataArray || []).find(
      (n) => n.category === "class"
    );
    if (!firstClass) return alert("No hay ninguna clase en el diagrama.");

    const body = {
      className: firstClass.name,
      dbEngine: "postgres",
      existingAttributes: firstClass.attributes || [],
      diagramContext: {
        classes: (model.nodeDataArray || [])
          .filter((n) => n.category === "class")
          .map((n) => n.name),
        relations: (model.linkDataArray || []).map((l) => ({
          from: l.from,
          to: l.to,
          type: l.category || "association",
        })),
      },
      lang: "es",
    };

    try {
      setBusy((b) => ({ ...b, ai: true }));
      const res = await fetch(`${apiBase}/ai/suggest-attributes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const sugg = data?.suggestions ?? [];
      if (!sugg.length) return alert("La IA no sugirió atributos.");
      firstClass.attributes = [
        ...(firstClass.attributes || []),
        ...sugg.map((s) => ({
          name: s.name,
          type: s.type,
          nullable: !!s.nullable,
          unique: !!s.unique,
        })),
      ];
      setModelJson(JSON.stringify(model, null, 2));
    } catch (err) {
      alert("Error al solicitar sugerencias IA: " + err.message);
    } finally {
      setBusy((b) => ({ ...b, ai: false }));
    }
  }

  async function shareLink() {
    if (!onDiagramPage) return;
    const model = assertModel();
    if (!model) return;
    try {
      setBusy((b) => ({ ...b, share: true }));
      const res = await fetch(`${apiBase}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      if (res.ok) {
        const data = await res.json();
        const url =
          data.url ||
          `${window.location.origin}${window.location.pathname}#share=${data.id}`;
        await navigator.clipboard.writeText(url);
        alert("🔗 Enlace de compartir copiado al portapapeles");
        return;
      }
    } catch {
      /* fallback debajo */
    } finally {
      setBusy((b) => ({ ...b, share: false }));
    }

    try {
      const raw = JSON.stringify(model);
      const base64 = btoa(unescape(encodeURIComponent(raw)));
      const url = `${location.origin}${location.pathname}#m=${base64}`;
      await navigator.clipboard.writeText(url);
      alert("🔗 Enlace copiado (modo sin servidor)");
    } catch (e) {
      alert("No se pudo generar el enlace local: " + e.message);
    }
  }

  // Atajos: solo en /diagram (limpios según nuevos botones)
  useEffect(() => {
    if (!onDiagramPage) return;
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const hit = () => {
        e.preventDefault();
        e.stopPropagation();
      };
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        hit();
        undo();
      } else if (
        (e.key.toLowerCase() === "z" && e.shiftKey) ||
        e.key.toLowerCase() === "y"
      ) {
        hit();
        redo();
      } else if (e.key.toLowerCase() === "s") {
        hit();
        downloadJSON();
      } else if (e.key.toLowerCase() === "o") {
        hit();
        fileRef.current?.click();
      } else if (e.key.toLowerCase() === "e") {
        hit();
        exportXMI();
      } else if (e.key.toLowerCase() === "g") {
        hit();
        generateSpring();
      } else if (e.key.toLowerCase() === "i") {
        hit();
        suggestAI();
      }
      // (quitados: +, -, 100%, #, validar, prettify)
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [
    onDiagramPage,
    undo,
    redo,
    downloadJSON,
    exportXMI,
    generateSpring,
    suggestAI,
  ]);

  const pct = Math.round((scale || 1) * 100);

  return (
    <>
      <style>{`
        .tb {
          position: sticky; top: 0; z-index: 1030;
          display:flex; flex-wrap:wrap; align-items:center; gap:.5rem;
          padding:.5rem .75rem; background:#f8fafc; border-bottom:1px solid #e5e7eb;
        }
        .tb .grp { display:flex; align-items:center; gap:.25rem; padding:.25rem; border:1px solid #e5e7eb; border-radius:.5rem; background:#fff; }
        .tb .btn { padding:.25rem .5rem; font-size:.875rem; }
        .tb .push { flex: 1 1 auto; }
      `}</style>

      <div className="tb">
        {/* Controles del editor: solo en /diagram */}
        {onDiagramPage && (
          <>
            <div className="grp" aria-label="Navegación">
              <button
                className="btn btn-outline-secondary"
                title="Atrás"
                onClick={undo}
                disabled={!canUndo}
              >
                ⟲
              </button>
              <button
                className="btn btn-outline-secondary"
                title="Adelante"
                onClick={redo}
                disabled={!canRedo}
              >
                ⟳
              </button>

              {/* Mantengo solo Ajustar y el selector de zoom */}
              <button
                className="btn btn-outline-secondary"
                title="Ajustar al contenido"
                onClick={zoomToFit}
              >
                ⤢
              </button>
              <select
                className="form-select form-select-sm ms-1"
                value={pct}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ width: 90 }}
                title="Zoom rápido"
              >
                {[50, 75, 100, 125, 150, 200].map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </div>

            <div className="grp" aria-label="Compartir">
              <button
                className="btn btn-outline-primary"
                onClick={shareLink}
                disabled={!hasModel || busy.share}
              >
                {busy.share ? "Generando..." : "Compartir"}
              </button>
            </div>

            <div className="grp" aria-label="Archivo">
              <button
                className="btn btn-primary"
                onClick={downloadJSON}
                disabled={!hasModel || busy.xmi || busy.spring || busy.ai}
              >
                Guardar JSON
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="d-none"
                onChange={loadJSON}
              />
              <button
                className="btn btn-outline-primary"
                onClick={() => fileRef.current?.click()}
                disabled={busy.xmi || busy.spring || busy.ai}
              >
                Cargar JSON
              </button>
              {/* Quitados: Validar y Prettify */}
            </div>

            <div className="grp" aria-label="Exportación">
              <button
                className="btn btn-outline-dark"
                onClick={exportXMI}
                disabled={!hasModel || busy.xmi}
              >
                {busy.xmi ? "Exportando…" : "Exportar XMI"}
              </button>
              <button
                className="btn btn-outline-dark"
                onClick={generateSpring}
                disabled={!hasModel || busy.spring}
              >
                {busy.spring ? "Generando…" : "Generar Spring"}
              </button>
            </div>

            <div className="grp" aria-label="IA">
              <button
                className="btn btn-outline-success"
                onClick={suggestAI}
                disabled={!hasModel || busy.ai}
              >
                {busy.ai ? "Consultando…" : "Sugerir Atributos (IA)"}
              </button>
            </div>
          </>
        )}

        <div className="push" />

        {/* Navegación de app + sesión */}
        {user && (
          <div className="grp" aria-label="App">
            <NavLink className="btn btn-link text-decoration-none" to="/">
              Dashboard
            </NavLink>
            <NavLink
              className="btn btn-link text-decoration-none"
              to="/diagram"
            >
              Diagram
            </NavLink>
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={doLogout}
            >
              <i className="bi bi-box-arrow-right me-1" /> Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </>
  );
}
