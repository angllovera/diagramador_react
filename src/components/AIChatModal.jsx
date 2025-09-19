import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function AIChatPanel({ open, onClose, onSend, initialPos }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);

  // Posición flotante (arrastrable)
  const panelRef = useRef(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, left: 0, top: 0 });

  // posición inicial (centro por defecto)
  const [pos, setPos] = useState(() => {
    const x = initialPos?.left ?? window.innerWidth / 2 - 220; // ~mitad - mitad ancho
    const y = initialPos?.top ?? window.innerHeight / 3;       // un poco arriba
    return { left: Math.max(8, x), top: Math.max(8, y) };
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 0);
    } else {
      setInput("");
      setBusy(false);
      setError("");
    }
  }, [open]);

  // Cerrar con ESC (no modal, pero útil)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose?.();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [open, busy, onClose]);

  // Drag simple
  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPos({
        left: Math.max(8, dragRef.current.left + dx),
        top: Math.max(8, dragRef.current.top + dy),
      });
    };
    const onUp = () => (dragRef.current.dragging = false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!open) return null;

  const examples = [
    `Crea clase Usuario(id int, nombre string, email string)`,
    `Crea clases Producto(nombre string, precio float) y Categoria(nombre)`,
    `Relaciona Usuario y Pedido (1 a N).`,
  ];

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    const text = input.trim();
    if (!text) return;
    setBusy(true);
    setError("");
    try {
      await onSend?.(text);
      setInput("");
    } catch (err) {
      const msg = (err && (err.message || err.toString())) || "No pude procesar el prompt.";
      setError(msg);
    } finally {
      setBusy(false);
      textareaRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  };

  const headerMouseDown = (e) => {
    // Iniciar drag al hacer mousedown en la barra
    const rect = panelRef.current.getBoundingClientRect();
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      left: rect.left,
      top: rect.top,
    };
  };

  // Contenedor pasivo: ¡no captura eventos, el canvas sigue usable!
  const wrapper = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none", // clave: click-through fuera del panel
        zIndex: 1000,
      }}
    >
      <div
        ref={panelRef}
        style={{
          position: "absolute",
          left: pos.left,
          top: pos.top,
          width: 440,
          maxWidth: "96vw",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 12px 30px rgba(0,0,0,.18)",
          overflow: "hidden",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          pointerEvents: "auto", // el panel sí recibe eventos
          userSelect: "none",
        }}
      >
        {/* Header (zona de arrastre) */}
        <div
          onMouseDown={headerMouseDown}
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            cursor: "move",
          }}
        >
          <strong style={{ fontSize: 14, userSelect: "none" }}>
            Asistente IA del diagrama
          </strong>
          <button
            onClick={() => !busy && onClose?.()}
            disabled={busy}
            style={{
              border: 0,
              background: "transparent",
              fontSize: 18,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.5 : 1,
              lineHeight: 1,
              userSelect: "none",
            }}
            aria-label="Cerrar"
            title="Cerrar (Esc)"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit} style={{ padding: 12, userSelect: "text" }}>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
            Ejemplos:&nbsp;
            {examples.map((ex, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setInput(ex)}
                disabled={busy}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  borderRadius: 999,
                  padding: "2px 8px",
                  marginRight: 6,
                  marginBottom: 6,
                  fontSize: 11,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                title="Usar ejemplo"
              >
                {ex.length > 36 ? ex.slice(0, 36) + "…" : ex}
              </button>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            rows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escribe qué quieres crear o relacionar… (Enter para enviar, Shift+Enter para salto de línea)"
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
              fontSize: 13,
              minHeight: 96,
              maxHeight: 240,
            }}
          />

          {error ? (
            <div
              role="alert"
              style={{
                marginTop: 8,
                color: "#b91c1c",
                background: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 12,
              }}
            >
              {error}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() => !busy && onClose?.()}
              disabled={busy}
              style={{
                padding: "7px 10px",
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                cursor: busy ? "not-allowed" : "pointer",
                fontSize: 13,
              }}
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={busy || !input.trim()}
              style={{
                padding: "7px 12px",
                background: "#111827",
                color: "#fff",
                border: "1px solid #111827",
                borderRadius: 8,
                cursor: busy || !input.trim() ? "not-allowed" : "pointer",
                minWidth: 104,
                fontSize: 13,
              }}
            >
              {busy ? "Generando…" : "Generar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Portal para evitar stacking issues con el canvas
  return createPortal(wrapper, document.body);
}
