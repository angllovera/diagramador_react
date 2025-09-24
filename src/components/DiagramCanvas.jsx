import { useEffect, useMemo, useRef, useState } from "react";
import { ReactDiagram } from "gojs-react";
import * as go from "gojs";
import { createDiagram } from "./gojsTemplates";
import { useDiagram } from "../context/DiagramContext";
import { getDiagram, updateDiagram } from "../api/diagrams";
import { useParams, useSearchParams } from "react-router-dom";
import { getSocket } from "../api/socket";
import { nanoid } from "nanoid";
import AIChatModal from "./AIChatModal";
import { actOnDiagram } from "../api/ai";

export default function DiagramCanvas() {
  const { /* registerDiagram, */ setModelJson, modelJson } = useDiagram();
  const [diagram, setDiagram] = useState(null);
  const [loading, setLoading] = useState(true);

  const initialLoadedRef = useRef(false);
  const debounceRef = useRef(null);
  const lastAppliedJsonRef = useRef("");
  const isApplyingFromJsonRef = useRef(false);
  const isLoadingRef = useRef(false);
  const socketRef = useRef(null);
  const clientIdRef = useRef(nanoid());

  const [chatOpen, setChatOpen] = useState(false);
  const aiRunIdPendingRef = useRef(null);

  const { id: idFromRoute } = useParams();
  const [qs] = useSearchParams();
  const idFromQuery = qs.get("diagramId") || qs.get("did") || "";
  const diagramId = idFromRoute || idFromQuery || "";

  const PAGE_STYLE = { width: "8.5in", height: "13in" };
  const PAGE_PX = { w: 8.5 * 96, h: 13 * 96 };

  // 👉 ref del contenedor del lienzo para posicionar el botón fijo
  const canvasCardRef = useRef(null);
  const [fabPos, setFabPos] = useState({
    top: -9999,
    left: -9999,
    visible: false,
  });

  // Calcula posición fija del botón en relación al lienzo
  useEffect(() => {
    const BTN = 56; // tamaño del botón
    const M = 12; // margen interno al borde del lienzo

    const update = () => {
      const el = canvasCardRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const top = Math.max(r.top + M, M);
      const left = Math.min(r.right - BTN - M, window.innerWidth - BTN - M);
      // visible si el lienzo está en el viewport
      const visible = r.bottom > 0 && r.top < window.innerHeight;
      setFabPos({ top, left, visible });
    };

    // actualizar en mount y en cada scroll/resize
    update();
    const onScroll = () => requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // por si el tamaño del contenedor cambia (zoomToFit, etc.)
    const ro = new ResizeObserver(update);
    if (canvasCardRef.current) ro.observe(canvasCardRef.current);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro.disconnect();
    };
  }, []);

  const initDiagram = useMemo(() => {
    return () => {
      const d = createDiagram?.();
      if (!d) return null;

      // Habilitar edición y arrastre
      d.isEnabled = true;
      d.isReadOnly = false;
      d.allowMove = true;
      d.toolManager.draggingTool.isEnabled = true;
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

      // Guardado + realtime incremental
      const onModelChanged = (e) => {
        if (!e.isTransactionFinished) return;
        if (d.undoManager.isUndoingRedoing) return;
        if (!initialLoadedRef.current) return;
        if (isLoadingRef.current) return;
        if (isApplyingFromJsonRef.current) return;

        const jsonStr = d.model.toJson();

        let snapshot;
        try {
          snapshot = JSON.parse(jsonStr);
        } catch {
          snapshot = {};
        }

        const hasVisuals = d.nodes.count > 0 || d.links.count > 0;
        const isEmpty =
          !snapshot.nodeDataArray?.length && !snapshot.linkDataArray?.length;
        if (isEmpty && hasVisuals) return;

        try {
          const last = JSON.parse(lastAppliedJsonRef.current || "{}");
          const lastHadData =
            (last?.nodeDataArray?.length || 0) > 0 ||
            (last?.linkDataArray?.length || 0) > 0;
          if (isEmpty && lastHadData) return;
        } catch {}

        setModelJson(JSON.stringify(snapshot, null, 2));

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          try {
            if (!diagramId) return;
            await updateDiagram(diagramId, {
              modelJson: jsonStr,
              aiRunId: aiRunIdPendingRef.current || null,
            });
            aiRunIdPendingRef.current = null;
          } catch (err) {
            console.error("Error guardando diagrama:", err);
          }
        }, 300);

        // Realtime incremental
        try {
          const sock = socketRef.current;
          if (sock && diagramId) {
            const incrementalJson = d.model.toIncrementalJson(e);
            sock.emit("diagram:change", {
              diagramId,
              incrementalJson,
              clientVersion: Date.now(),
              source: clientIdRef.current,
            });
          }
        } catch (err) {
          console.warn("No pude emitir cambio realtime:", err);
        }
      };

      d.addModelChangedListener(onModelChanged);
      d.__dispose = () => d.removeModelChangedListener(onModelChanged);

      setDiagram(d);
      return d;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramId]);

  // Carga inicial del modelo
  useEffect(() => {
    if (!diagram) return;

    (async () => {
      setLoading(true);
      isLoadingRef.current = true;
      isApplyingFromJsonRef.current = true;
      try {
        if (!diagramId) {
          const empty = {
            class: "go.GraphLinksModel",
            nodeDataArray: [],
            linkDataArray: [],
          };
          diagram.model = go.Model.fromJson(empty);
          setModelJson(JSON.stringify(empty, null, 2));
          lastAppliedJsonRef.current = JSON.stringify(empty);
        } else {
          const dto = await getDiagram(diagramId);
          const raw = dto?.modelJson;
          let model;
          try {
            model = typeof raw === "string" ? JSON.parse(raw) : raw ?? {};
          } catch {
            model = {};
          }

          if (!model.class || model.class === "GraphLinksModel")
            model.class = "go.GraphLinksModel";
          if (!Array.isArray(model.nodeDataArray)) model.nodeDataArray = [];
          if (!Array.isArray(model.linkDataArray)) model.linkDataArray = [];
          if (!model.nodeKeyProperty) model.nodeKeyProperty = "key";
          if (!model.linkKeyProperty) model.linkKeyProperty = "key";
          if (!model.linkCategoryProperty)
            model.linkCategoryProperty = "category";

          // migrar posiciones antiguas a 'loc' (opcional)
          for (const n of model.nodeDataArray) {
            if (!n.loc && (n.position || n.location)) {
              const p = n.position || n.location;
              if (typeof p === "string") n.loc = p;
              else if (p && typeof p.x === "number" && typeof p.y === "number")
                n.loc = `${p.x} ${p.y}`;
            }
          }

          diagram.animationManager.isEnabled = false;
          diagram.model = go.Model.fromJson(model);
          lastAppliedJsonRef.current = JSON.stringify(model);
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
        isLoadingRef.current = false;
        isApplyingFromJsonRef.current = false;
      }
    })();

    return () => {
      if (diagram && diagram.__dispose) diagram.__dispose();
    };
  }, [diagram, diagramId, setModelJson]);

  // Aplicar cambios de modelJson externo (editor/otra fuente)
  useEffect(() => {
    if (!diagram) return;

    const txt = (modelJson ?? "").trim();
    if (!txt) return;
    if (txt === lastAppliedJsonRef.current) return;

    try {
      let obj =
        typeof modelJson === "string" ? JSON.parse(modelJson) : modelJson;
      if (!obj || typeof obj !== "object") return;

      if (!obj.class || obj.class === "GraphLinksModel")
        obj.class = "go.GraphLinksModel";
      obj.nodeKeyProperty = obj.nodeKeyProperty || "key";
      obj.linkKeyProperty = obj.linkKeyProperty || "key";
      obj.linkCategoryProperty = obj.linkCategoryProperty || "category";
      if (!Array.isArray(obj.nodeDataArray)) obj.nodeDataArray = [];
      if (!Array.isArray(obj.linkDataArray)) obj.linkDataArray = [];

      const prev = initialLoadedRef.current;
      initialLoadedRef.current = false;
      isApplyingFromJsonRef.current = true;

      const wasAnim = diagram.animationManager.isEnabled;
      diagram.animationManager.isEnabled = false;
      diagram.model = go.Model.fromJson(obj);
      if (diagram.nodes.count > 0) diagram.zoomToFit();
      diagram.animationManager.isEnabled = wasAnim;

      lastAppliedJsonRef.current =
        typeof modelJson === "string" ? modelJson : JSON.stringify(obj);
      initialLoadedRef.current = prev;
    } catch (e) {
      console.error("JSON inválido al aplicar en el diagrama:", e);
    } finally {
      isApplyingFromJsonRef.current = false;
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

  // Realtime con Socket.IO
  useEffect(() => {
    if (!diagram) return;
    if (!diagramId) return;

    const socket = getSocket();
    socketRef.current = socket;

    socket.emit("diagram:join", { diagramId, userId: "anon" });

    const onRemoteChange = ({
      diagramId: dId,
      incrementalJson,
      modelJson,
      source,
    }) => {
      if (dId !== diagramId) return;
      if (source && source === clientIdRef.current) return;

      try {
        isApplyingFromJsonRef.current = true;

        const wasAnim = diagram.animationManager.isEnabled;
        diagram.animationManager.isEnabled = false;

        if (incrementalJson) {
          diagram.commit((d) => {
            d.model.applyIncrementalJson(incrementalJson);
          }, "apply incremental");
        } else if (modelJson) {
          diagram.model = go.Model.fromJson(JSON.parse(modelJson));
        }

        if (diagram.nodes.count > 0) diagram.zoomToFit();
        diagram.animationManager.isEnabled = wasAnim;

        if (modelJson) {
          lastAppliedJsonRef.current = modelJson;
          setModelJson(JSON.stringify(JSON.parse(modelJson), null, 2));
        }
      } catch (e) {
        console.error("No pude aplicar cambio remoto:", e);
      } finally {
        isApplyingFromJsonRef.current = false;
      }
    };

    socket.on("diagram:changed", onRemoteChange);
    return () => socket.off("diagram:changed", onRemoteChange);
  }, [diagram, diagramId, setModelJson]);

  // === 🔧 funciones usadas en JSX: declaradas ANTES del return ===
  function applyOps(d, payload) {
    if (!d || !payload) return;
    const ops = Array.isArray(payload.ops) ? payload.ops : [];
    const m = d.model;

    m.startTransaction("ai upsert");

    for (const op of ops) {
      if (op.type === "add_classes" && Array.isArray(op.classes)) {
        for (const c of op.classes) {
          if (!c || !c.name) continue;
          const key = String(c.name).trim();
          const exists = m.findNodeDataForKey(key);
          const nodeData = {
            key,
            category: "class",
            name: c.name,
            stereotype: c.stereotype || undefined,
            abstract: !!c.abstract,
            attributes: Array.isArray(c.attributes) ? c.attributes : [],
            operations: Array.isArray(c.operations) ? c.operations : [],
            loc: c.loc || undefined,
            size: c.size || undefined,
          };
          if (exists) {
            Object.keys(nodeData).forEach((k) =>
              m.setDataProperty(exists, k, nodeData[k])
            );
          } else {
            m.addNodeData(nodeData);
          }
        }
      }

      if (op.type === "relate" && Array.isArray(op.relations)) {
        for (const r of op.relations) {
          if (!r || !r.from || !r.to) continue;
          const from = String(r.from).trim();
          const to = String(r.to).trim();
          const category = r.type || "association";

          if (!m.findNodeDataForKey(from))
            m.addNodeData({ key: from, category: "class", name: from });
          if (!m.findNodeDataForKey(to))
            m.addNodeData({ key: to, category: "class", name: to });

          const dup = Array.from(d.links).some(
            (l) =>
              l.data &&
              l.data.from === from &&
              l.data.to === to &&
              (l.data.category || "association") === category
          );
          if (!dup) {
            m.addLinkData({
              key: `${from}->${to}:${category}`,
              from,
              to,
              category,
              fromMultiplicity: r.fromMultiplicity || "",
              toMultiplicity: r.toMultiplicity || "",
            });
          }
        }
      }
    }

    m.commitTransaction("ai upsert");
    if (d.nodes.count > 0) d.zoomToFit();
  }

  async function handlePrompt(text) {
    if (!diagram || !diagramId) return;

    try {
      const resp = await actOnDiagram({
        diagramId,
        message: text,
      });

      aiRunIdPendingRef.current = resp.aiRunId || null;

      // aplicar cambios al diagrama
      applyOps(diagram, resp);
    } catch (err) {
      console.error("Error en actOnDiagram:", err);
      alert("No pude procesar el prompt.");
    }
  }

  // === JSX ===
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
        ref={canvasCardRef} // 👈 referencia del contenedor del lienzo
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
        <ReactDiagram
          initDiagram={initDiagram}
          divClassName="w-100 h-100"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Botón IA — flotante fijado al borde superior-derecho del lienzo */}
        <button
          onClick={() => setChatOpen(true)}
          title="Generar con IA"
          aria-label="Abrir asistente de IA"
          style={{
            position: "fixed", // fijo al viewport
            top: fabPos.top, // pero posicionado con base al rect del lienzo
            left: fabPos.left,
            display: fabPos.visible ? "block" : "none",
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(0,0,0,.15)",
            fontSize: 22,
            fontWeight: 700,
            background: "#111827",
            color: "#fff",
            zIndex: 1000,
          }}
        >
          IA
        </button>

        {/* Modal de chat */}
        <AIChatModal
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          onSend={handlePrompt}
        />

        {/* Overlay loading */}
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
              pointerEvents: "none",
            }}
          >
            Cargando diagrama…
          </div>
        )}
      </div>
    </div>
  );
}
