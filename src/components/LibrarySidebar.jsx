// src/components/LibrarySidebar.jsx
import Palette from "./Palette";

export default function LibrarySidebar({ onClose }) {
  return (
    <>
      {/* Estilos locales para estética + scrollbars delgadas */}
      <style>{`
        :root{
          --lib-border: #e5e7eb;
          --lib-bg: #ffffff;
          --lib-title: #0f172a;
          --scroll-track: transparent;
          --scroll-thumb: #cbd5e1;
          --scroll-thumb-hover: #94a3b8;
        }

        /* Scrollbars finas (afecta a toda la página) */
        * { scrollbar-width: thin; scrollbar-color: var(--scroll-thumb) var(--scroll-track); }
        *::-webkit-scrollbar { width: 8px; height: 8px; }
        *::-webkit-scrollbar-track { background: var(--scroll-track); }
        *::-webkit-scrollbar-thumb {
          background-color: var(--scroll-thumb);
          border-radius: 8px;
          border: 2px solid transparent;   /* crea “padding” visual */
          background-clip: content-box;
        }
        *::-webkit-scrollbar-thumb:hover { background-color: var(--scroll-thumb-hover); }

        /* Sidebar */
        .lib-aside { background: var(--lib-bg); border-right: 1px solid var(--lib-border); }
        .lib-hdr {
          position: sticky; top: 0; z-index: 1;
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 12px;
          background: linear-gradient(180deg, #ffffffcc, #ffffff);
          border-bottom: 1px solid var(--lib-border);
          backdrop-filter: saturate(170%) blur(2px);
        }
        .lib-title { font-weight: 600; letter-spacing: .2px; color: var(--lib-title); }

        .lib-body { padding: 10px; min-height: 0; }
        .lib-card {
          height: 100%;
          border: 1px solid var(--lib-border);
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(15,23,42,.05);
          overflow: hidden; /* el scroll lo maneja GoJS dentro de Palette */
          background: #fff;
        }
      `}</style>

      <aside className="lib-aside d-flex flex-column" style={{ height: "100%", minHeight: 0 }}>
        {/* Header */}
        <div className="lib-hdr">
          <span className="lib-title">Biblioteca</span>
          {onClose && (
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose} title="Cerrar">
              ✕
            </button>
          )}
        </div>

        {/* Contenido (un solo scroll: el de GoJS) */}
        <div className="lib-body flex-grow-1">
          <div className="lib-card">
            {/* Ocupa todo el alto disponible del panel */}
            <Palette height="100%" />
          </div>
        </div>
      </aside>
    </>
  );
}
