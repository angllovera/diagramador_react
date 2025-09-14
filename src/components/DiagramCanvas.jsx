import { useEffect, useMemo, useRef, useState } from "react";
import { ReactDiagram } from "gojs-react";
import * as go from "gojs";
import { createDiagram } from "./gojsTemplates";
import { useDiagram } from "../context/DiagramContext";
import { getDiagram, updateDiagram } from "../api/diagrams";
import { useParams, useSearchParams } from "react-router-dom";

export default function DiagramCanvas() {
  const { registerDiagram, setModelJson, modelJson } = useDiagram();
  const [diagram, setDiagram] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialLoadedRef = useRef(false);
  const debounceRef = useRef(null);
  const lastAppliedJsonRef = useRef(""); // ← para evitar aplicar 2 veces el mismo JSON
  const isApplyingFromJsonRef = useRef(false);

  // ---- ID del diagrama: ruta > query (soporta ambos)
  const { id: idFromRoute } = useParams(); // /diagram/:id
  const [qs] = useSearchParams();
  const idFromQuery = qs.get("diagramId") || qs.get("did") || "";
  const diagramId = idFromRoute || idFromQuery || "";

  // Hoja Oficio 8.5" x 13"
  const PAGE_STYLE = { width: "8.5in", height: "13in" };
  const PAGE_PX = { w: 8.5 * 96, h: 13 * 96 };

  const initDiagram = useMemo(() => {
    return () => {
      const d = createDiagram?.();
      if (!d) return null;

      // Undo/redo
      d.undoManager.isEnabled = true;

      // Estética / navegación
      if (d.div) d.div.style.background = "#f5f6f8";
      d.toolManager.mouseWheelBehavior = go.ToolManager.WheelZoom;
      if (d.grid) {
        d.grid.visible = true;
        d.grid.gridCellSize = new go.Size(20, 20);
      }
      d.initialDocumentSpot = go.Spot.TopLeft;
      d.initialViewportSpot = go.Spot.TopLeft;
      d.padding = 0;
      d.fixedBounds = new go.Rect(0, 0, PAGE_PX.w, PAGE_PX.h);
      d.hasHorizontalScrollbar = false;
      d.hasVerticalScrollbar = false;
      d.toolManager.panningTool.isEnabled = false;

      // Bloquear flechas moviendo viewport
      d.commandHandler.doKeyDown = function () {
        const e = d.lastInput;
        if (["Left", "Right", "Up", "Down"].includes(e.key)) return;
        go.CommandHandler.prototype.doKeyDown.call(this);
      };

      // Registrar y escuchar cambios (autosave con debounce)
      registerDiagram(d);
      const onModelChanged = (e) => {
        if (!e.isTransactionFinished) return;
        if (d.undoManager.isUndoingRedoing) return;
        if (!initialLoadedRef.current) return;

        const jsonStr = d.model.toJson();

        try {
          setModelJson(JSON.stringify(JSON.parse(jsonStr), null, 2));
        } catch {
          setModelJson(jsonStr);
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          try {
            if (!diagramId) return;
            await updateDiagram(diagramId, { modelJson: JSON.parse(jsonStr) });
          } catch (err) {
            console.error("Error guardando diagrama:", err);
          }
        }, 300);
      };
      d.addModelChangedListener(onModelChanged);
      d.__dispose = () => d.removeModelChangedListener(onModelChanged);

      setDiagram(d);
      return d;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramId]); // si cambias de diagrama, se re-inicia

  // Carga inicial del modelo (SIEMPRE después de que exista `diagram`)
  useEffect(() => {
    if (!diagram) return;

    (async () => {
      setLoading(true);
      try {
        if (!diagramId) {
          const empty = {
            class: "go.GraphLinksModel",
            nodeDataArray: [],
            linkDataArray: [],
          };
          diagram.model = go.Model.fromJson(empty);
          setModelJson(JSON.stringify(empty, null, 2));
        } else {
          const dto = await getDiagram(diagramId);
          // ⚠️ Puede venir como string; parsea y normaliza
          const raw = dto?.modelJson;
          let model = raw;
          try {
            if (typeof model === "string") model = JSON.parse(model);
          } catch {}
          if (!model || typeof model !== "object") model = {};
          if (!model.class || model.class === "GraphLinksModel")
            model.class = "go.GraphLinksModel";
          if (!Array.isArray(model.nodeDataArray)) model.nodeDataArray = [];
          if (!Array.isArray(model.linkDataArray)) model.linkDataArray = [];
          if (!model.nodeKeyProperty) model.nodeKeyProperty = "key";
          if (!model.linkKeyProperty) model.linkKeyProperty = "key";
          if (!model.linkCategoryProperty)
            model.linkCategoryProperty = "category";

          diagram.model = go.Model.fromJson(model);
          setModelJson(JSON.stringify(model, null, 2));
        }
      } catch (e) {
        console.error("No se pudo cargar el diagrama:", e);
        const empty = {
          class: "go.GraphLinksModel",
          nodeDataArray: [],
          linkDataArray: [],
        };
        diagram.model = go.Model.fromJson(empty);
        setModelJson(JSON.stringify(empty, null, 2));
      } finally {
        initialLoadedRef.current = true;
        setLoading(false);
      }
    })();

    return () => {
      if (diagram && diagram.__dispose) diagram.__dispose();
    };
  }, [diagram, diagramId, setModelJson]);

  useEffect(() => {
    if (!diagram) return;

    const txt = (modelJson ?? "").trim();
    if (!txt) return;

    // evita aplicar el mismo JSON 2 veces
    if (txt === lastAppliedJsonRef.current) return;

    try {
      // parse seguro (acepta string u objeto)
      let obj =
        typeof modelJson === "string" ? JSON.parse(modelJson) : modelJson;
      if (!obj || typeof obj !== "object") return;

      // normalización mínima para GoJS
      if (!obj.class || obj.class === "GraphLinksModel")
        obj.class = "go.GraphLinksModel";
      obj.nodeKeyProperty = obj.nodeKeyProperty || "key";
      obj.linkKeyProperty = obj.linkKeyProperty || "key";
      obj.linkCategoryProperty = obj.linkCategoryProperty || "category";
      if (!Array.isArray(obj.nodeDataArray)) obj.nodeDataArray = [];
      if (!Array.isArray(obj.linkDataArray)) obj.linkDataArray = [];

      // Pausar autosave mientras reemplazamos
      const prev = initialLoadedRef.current;
      initialLoadedRef.current = false;
      isApplyingFromJsonRef.current = true;

      // Aplicar modelo sin animación/slide
      const wasAnim = diagram.animationManager.isEnabled;
      diagram.animationManager.isEnabled = false;
      diagram.model = go.Model.fromJson(obj);
      // si no quieres zoomToFit automático, comenta la siguiente línea
      if (diagram.nodes.count > 0) diagram.zoomToFit();
      diagram.animationManager.isEnabled = wasAnim;

      // Marcar como aplicado para no repetir
      lastAppliedJsonRef.current =
        typeof modelJson === "string" ? modelJson : JSON.stringify(obj);

      // Reanudar autosave
      initialLoadedRef.current = prev;

      // Persistir una vez (importante en proyectos nuevos)
      if (diagramId) {
        updateDiagram(diagramId, { modelJson: obj })
          .catch((err) =>
            console.error("Error guardando tras cargar JSON:", err)
          )
          .finally(() => {
            isApplyingFromJsonRef.current = false;
          });
      } else {
        isApplyingFromJsonRef.current = false;
      }
    } catch (e) {
      console.error("JSON inválido al aplicar en el diagrama:", e);
    }
  }, [diagram, modelJson, diagramId]);

  // Atajos: +/-, F, 0
  useEffect(() => {
    if (!diagram) return;
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || "";
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        diagram.commandHandler.increaseZoom();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        diagram.commandHandler.decreaseZoom();
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        diagram.zoomToFit();
      } else if (e.key === "0") {
        e.preventDefault();
        diagram.scale = 1;
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [diagram]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#eef0f4",
        overflowY: "auto",
        display: "grid",
        placeItems: "start center",
      }}
    >
      <div
        style={{
          ...PAGE_STYLE,
          position: "relative",
          background: "#fff",
          border: "1px solid #dde1e6",
          borderRadius: 6,
          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
          overflow: "hidden",
          margin: "48px 0 120px",
        }}
      >
        {/* IMPORTANTE: el ReactDiagram se renderiza SIEMPRE */}
        <ReactDiagram
          initDiagram={initDiagram}
          divClassName="w-100 h-100"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Overlay de carga, sin bloquear el montaje del diagram */}
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,.6)",
              display: "grid",
              placeItems: "center",
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            Cargando diagrama…
          </div>
        )}
      </div>
    </div>
  );
}
