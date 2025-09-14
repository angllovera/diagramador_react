import { useState, useMemo } from "react";
import { ReactPalette } from "gojs-react";
import { createPalette } from "./gojsTemplates";

export default function Palette({ height = 560 }) {
  const [mode, setMode] = useState("grid"); // "grid" | "list"

  const initPalette = useMemo(() => {
    return () => createPalette(mode); // une todas las categorías
  }, [mode]);

  return (
    // Contenedor con alto fijo (lo recibe por prop)
    <div className="d-flex flex-column w-100" style={{ height, minHeight: 0 }}>
      {/* mini header fijo */}
      <div
        className="d-flex align-items-center justify-content-between mb-2 sticky-top"
        style={{ top: 0, background: "#fff", zIndex: 2, paddingTop: 4, paddingBottom: 4 }}
      >
        <div className="btn-group btn-group-sm" role="group" aria-label="Vista paleta">
          <button
            type="button"
            className={`btn btn-outline-secondary ${mode === "grid" ? "active" : ""}`}
            onClick={() => setMode("grid")}
            title="Vista iconos"
          >
            ⬛⬛
          </button>
          <button
            type="button"
            className={`btn btn-outline-secondary ${mode === "list" ? "active" : ""}`}
            onClick={() => setMode("list")}
            title="Vista lista"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Área de paleta: SIN scroll del contenedor; lo maneja GoJS */}
      <div
        className="flex-grow-1 w-100"
        style={{
          minHeight: 0,
          overflow: "hidden",            // 👈 clave: quita scroll del panel
          border: "1px solid #e5e7eb",
          borderRadius: 8
        }}
      >
        <ReactPalette
          key={mode}
          initPalette={initPalette}
          divClassName="w-100 h-100"
          style={{ width: "100%", height: "100%", outline: "none" }}
        />
      </div>
    </div>
  );
}
