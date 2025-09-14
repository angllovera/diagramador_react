// src/context/DiagramContext.jsx
import { createContext, useContext, useRef, useState } from "react";

const DiagramCtx = createContext(null);

// 💡 tu DEFAULT_MODEL como ya lo tienes
const DEFAULT_MODEL = {
  class: "go.GraphLinksModel",
  nodeDataArray: [],
  linkDataArray: [],
};

export function DiagramProvider({ children }) {
  const [modelJson, setModelJson] = useState(JSON.stringify(DEFAULT_MODEL, null, 2));

  // ---- nuevo: referencia al diagrama y estado de controles
  const diagramRef = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [scale, setScale]   = useState(1);

  // Llamar esto una sola vez desde DiagramCanvas cuando crees el diagram
  const registerDiagram = (d) => {
    diagramRef.current = d;
    const update = () => {
      const ch = d.commandHandler;
      setCanUndo(ch.canUndo());
      setCanRedo(ch.canRedo());
      setScale(d.scale ?? 1);
      // si quieres mantener sincronizado el JSON:
      try { setModelJson(JSON.stringify(d.model.toJson(), null, 2)); } catch {}
    };

    d.addDiagramListener("Modified", update);
    d.addDiagramListener("ViewportBoundsChanged", update);
    d.addDiagramListener("SelectionMoved", update);
    d.addDiagramListener("LinkDrawn", update);
    d.addDiagramListener("LinkRelinked", update);
    d.model.addChangedListener(e => { if (e.isTransactionFinished) update(); });

    update();
  };

  const getD = () => diagramRef.current;

  // ---- comandos disponibles para la Toolbar
  const undo       = () => getD()?.commandHandler.undo();
  const redo       = () => getD()?.commandHandler.redo();
  const zoomIn     = () => getD()?.commandHandler.increaseZoom(0.1);
  const zoomOut    = () => getD()?.commandHandler.decreaseZoom(0.1);
  const resetZoom  = () => { const d = getD(); if (d) d.scale = 1; };
  const zoomToFit  = () => getD()?.zoomToFit();
  const setZoom    = (pct) => { const d = getD(); if (d) d.scale = Math.max(0.2, Math.min(3, pct/100)); };
  const toggleGrid = () => { const d = getD(); if (d) d.grid.visible = !d.grid.visible; };

  return (
    <DiagramCtx.Provider value={{
      modelJson, setModelJson,
      registerDiagram,
      // estado
      canUndo, canRedo, scale,
      // comandos
      undo, redo, zoomIn, zoomOut, resetZoom, zoomToFit, setZoom, toggleGrid,
    }}>
      {children}
    </DiagramCtx.Provider>
  );
}

export const useDiagram = () => useContext(DiagramCtx);
