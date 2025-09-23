import { createContext, useContext, useRef, useState } from "react";
import * as go from "gojs";

const DiagramCtx = createContext(null);

const DEFAULT_MODEL = {
  class: "go.GraphLinksModel",
  nodeDataArray: [],
  linkDataArray: [],
};

export function DiagramProvider({ children }) {
  const [modelJson, setModelJson] = useState(JSON.stringify(DEFAULT_MODEL, null, 2));

  const diagramRef = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [scale, setScale]   = useState(1);

  const registerDiagram = (d) => {
    diagramRef.current = d || null;
    if (!d) return;

    const update = () => {
      const ch = d.commandHandler;
      setCanUndo(ch.canUndo());
      setCanRedo(ch.canRedo());
      setScale(d.scale ?? 1);
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

  const undo       = () => getD()?.commandHandler.undo();
  const redo       = () => getD()?.commandHandler.redo();
  const zoomIn     = () => getD()?.commandHandler.increaseZoom(0.1);
  const zoomOut    = () => getD()?.commandHandler.decreaseZoom(0.1);
  const resetZoom  = () => { const d = getD(); if (d) d.scale = 1; };
  const zoomToFit  = () => getD()?.zoomToFit();
  const setZoom    = (pct) => { const d = getD(); if (d) d.scale = Math.max(0.2, Math.min(3, pct/100)); };
  const toggleGrid = () => { const d = getD(); if (d?.grid) d.grid.visible = !d.grid.visible; };

  const pickDiagramFallback = () => {
    // 1) contexto
    let d = getD();
    if (d) return d;
    // 2) último activo global
    try { d = window.__activeDiagram || null; } catch {}
    if (d) return d;
    // 3) último del arreglo global
    try {
      if (Array.isArray(window.__goDiagrams) && window.__goDiagrams.length) {
        d = window.__goDiagrams[window.__goDiagrams.length - 1];
      }
    } catch {}
    return d || null;
  };

  const printDiagram = async () => {
    const d = pickDiagramFallback();
    if (!d) { alert("No hay diagrama activo para imprimir."); return; }

    try {
      const fb = d.fixedBounds || d.documentBounds;
      const width = Math.ceil(fb.width);
      const height = Math.ceil(fb.height);

      const svg = d.makeSvg({
        scale: 1,
        position: fb.position,
        size: new go.Size(width, height),
        background: "white",
        showTemporary: false,
      });
      if (!svg) throw new Error("No se pudo generar el SVG del diagrama.");

      const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Imprimir diagrama</title>
<style>
  @page { size: 8.5in 13in; margin: 0.5cm; }
  @media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  body { margin: 0; padding: 0; display: grid; place-items: center; background: white; }
  .sheet { width: 8.5in; height: 13in; display: grid; place-items: center; }
  .sheet > .wrap { max-width: 100%; max-height: 100%; overflow: hidden; }
  svg { width: ${width}px; height: ${height}px; }
</style>
</head>
<body>
  <div class="sheet"><div class="wrap">${svg.outerHTML}</div></div>
  <script>
    window.onload = () => {
      try { window.focus(); } catch {}
      setTimeout(() => { try { window.print(); } catch {} ; setTimeout(() => { try { window.close(); } catch {} }, 300); }, 100);
    };
  </script>
</body>
</html>`;

      const w = window.open("", "print-diagram", "width=1024,height=768");
      if (!w) { alert("Bloqueo de ventanas emergentes: habilita popups para imprimir."); return; }
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (err) {
      console.error(err);
      alert("No se pudo preparar la impresión: " + (err?.message || err));
    }
  };

  return (
    <DiagramCtx.Provider value={{
      modelJson, setModelJson,
      registerDiagram,
      canUndo, canRedo, scale,
      undo, redo, zoomIn, zoomOut, resetZoom, zoomToFit, setZoom, toggleGrid,
      printDiagram,
    }}>
      {children}
    </DiagramCtx.Provider>
  );
}

export const useDiagram = () => useContext(DiagramCtx);
