import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import * as Diagrams from "../api/diagrams";
import DiagramCanvas from "../components/DiagramCanvas";
import LibrarySidebar from "../components/LibrarySidebar";

export default function Diagram() {
  const { id } = useParams();
  const [libW, setLibW] = useState(260);
  const [diagram, setDiagram] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  if (!id) return <Navigate to="/" replace />;

  const EMPTY_MODEL = useMemo(
    () => ({
      class: "go.GraphLinksModel",
      nodeDataArray: [],
      linkDataArray: [],
    }),
    []
  );

  const parseModel = (val) => {
    if (val == null) return EMPTY_MODEL;
    if (typeof val === "object") return val;
    try {
      return JSON.parse(String(val));
    } catch {
      return EMPTY_MODEL;
    }
  };

  const modelForCanvas = useMemo(() => {
    if (!diagram) return EMPTY_MODEL;
    const raw = diagram.modelJson ?? diagram.model_json ?? diagram.model;
    return parseModel(raw);
  }, [diagram, EMPTY_MODEL]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const d = await Diagrams.getDiagram(id);
        if (alive) setDiagram(d);
      } catch (e) {
        if (alive) setError(e?.message || "No se pudo cargar el diagrama");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // Debounce simple
  const tRef = useRef(null);
  async function handleChange(nextModelObj) {
    if (!diagram) return;
    // optimista
    setDiagram((prev) => (prev ? { ...prev, modelJson: nextModelObj } : prev));

    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const updated = await Diagrams.updateDiagram(diagram.id || id, {
          name: diagram.name,
          modelJson: nextModelObj,
        });
        setDiagram(updated);
      } catch (e) {
        console.error("save error:", e);
        setError(e?.message || "No se pudo guardar");
      } finally {
        setSaving(false);
      }
    }, 400);
  }

  const minW = 200,
    maxW = 520;
  function startDrag(e) {
    e.preventDefault();
    const startX = ("touches" in e ? e.touches[0] : e).clientX;
    const startW = libW;
    const onMove = (ev) => {
      const x = ("touches" in ev ? e.touches?.[0] || ev.touches[0] : ev)
        .clientX;
      const next = Math.min(maxW, Math.max(minW, startW + (x - startX)));
      setLibW(next);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  }

  return (
    <>
      <style>{`
        html, body, #root { height:100%; }
        body { margin:0; overflow:hidden; }
        .work { display:grid; grid-template-columns:${libW}px 6px 1fr; height:100vh; overflow:hidden; background:#fff; }
        .lib { border-right:1px solid rgba(0,0,0,.08); background:#fff; overflow:auto; }
        .resizer { background:transparent; cursor:col-resize; position:relative; }
        .resizer::after { content:""; position:absolute; left:2px; top:0; bottom:0; width:2px; background:rgba(0,0,0,.08); }
        .canvas { background:#f5f6f8; overflow:auto; }
        .sheet-pad { min-height:100%; padding:16px; }
        .sheet { height: calc(100% - 32px); min-height:480px; position:relative; }
        .badge-saving { position:absolute; top:12px; right:12px; }
      `}</style>

      <div className="work">
        <aside className="lib">
          <LibrarySidebar />
        </aside>
        <div
          className="resizer"
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          role="separator"
          aria-orientation="vertical"
        />
        <main className="canvas">
          <div className="sheet-pad">
            <div className="sheet">
              {loading && <div className="p-3">Cargando…</div>}
              {!loading && error && (
                <div className="p-3 text-danger">Error: {error}</div>
              )}
              {!loading && !error && (
                <>
                  <DiagramCanvas
                    modelJson={modelForCanvas}
                    onChange={handleChange}
                  />
                  {saving && (
                    <span className="badge text-bg-secondary badge-saving">
                      Guardando…
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
