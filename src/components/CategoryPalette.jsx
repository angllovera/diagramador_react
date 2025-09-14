// src/components/CategoryPalette.jsx
import { useMemo } from "react";
import { ReactPalette } from "gojs-react";
//import { createPaletteFor } from "../components/gojsTemplates";
import { createPaletteFor } from "./gojsTemplates";

export default function CategoryPalette({ category, mode = "grid", height = 220 }) {
  const initPalette = useMemo(() => {
    return () => createPaletteFor(category, mode);
  }, [category, mode]);

  return (
    <div className="w-100" style={{ height, minHeight: 0 }}>
      <ReactPalette
        key={`${category}-${mode}`}
        initPalette={initPalette}
        divClassName="w-100 h-100"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}


