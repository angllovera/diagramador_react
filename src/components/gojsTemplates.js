import * as go from "gojs";

// ---- Reusables: construimos las plantillas una sola vez
function makeNodeTemplateMap(opts = { compact: false }) {
  const $ = go.GraphObject.make;
  const textStyle = {
    font: "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    stroke: "#1f2937",
  };

  const padSm = opts.compact ? 4 : 6;
  const padMd = opts.compact ? 6 : 8;
  const minW = opts.compact ? 140 : 170;
  const blockMargin = opts.compact
    ? new go.Margin(2, 2, 6, 2)
    : new go.Margin(4, 4, 12, 4);

  const map = new go.Map();

  function makePort(name, spot, output, input) {
    return $(go.Shape, "Circle", {
      fill: "transparent",
      stroke: null,
      desiredSize: new go.Size(8, 8),
      alignment: spot,
      alignmentFocus: spot,
      portId: name,
      fromSpot: spot,
      toSpot: spot,
      fromLinkable: output,
      toLinkable: input,
      cursor: "pointer",
      mouseEnter: (e, port) => {
        if (!e.diagram.isReadOnly) port.fill = "#93c5fd";
      },
      mouseLeave: (e, port) => (port.fill = "transparent"),
    });
  }

  // ---- Node: Class (ahora con stereotype / abstract / operations)
  map.add(
    "class",
    $(
      go.Node,
      "Spot",
      {
        selectionAdorned: true,
        resizable: true,
        resizeObjectName: "BODY",
        locationSpot: go.Spot.Center,
        margin: blockMargin,
        movable: true, // 👈 asegura arrastre
        cursor: "move",
      },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(
        go.Point.stringify
      ),
      new go.Binding('desiredSize','size', go.Size.parse).makeTwoWay(go.Size.stringify),
      $(
        go.Panel,
        "Auto",
        { name: "BODY" },
        $(go.Shape, "RoundedRectangle", {
          fill: "#fff",
          stroke: "#111827",
          strokeWidth: 1.2,
        }),
        $(
          go.Panel,
          "Table",
          { stretch: go.GraphObject.Fill, minSize: new go.Size(minW, NaN) },
          $(go.RowColumnDefinition, { row: 0 }),
          // Estereotipo (opcional)
          $(
            go.Panel,
            "Auto",
            {
              row: 0,
              background: "#f9fafb",
              padding: new go.Margin(padSm - 2, padMd, 0, padMd),
              visible: false,
            },
            new go.Binding("visible", "stereotype", (s) => !!s),
            $(
              go.TextBlock,
              {
                ...textStyle,
                font: "italic 11px system-ui",
                stroke: "#6b7280",
              },
              new go.Binding("text", "stereotype", (s) => `«${s}»`)
            )
          ),
          // Título
          $(
            go.Panel,
            "Auto",
            {
              row: 1,
              background: "#f3f4f6",
              padding: new go.Margin(padSm, padMd, padSm, padMd),
            },
            $(
              go.TextBlock,
              { ...textStyle, editable: true },
              new go.Binding("font", "abstract", (a) =>
                a ? "italic 13px system-ui" : "bold 13px system-ui"
              ),
              new go.Binding("text", "name").makeTwoWay()
            )
          ),
          // Encabezado atributos
          $(
            go.Panel,
            "Auto",
            {
              row: 2,
              background: "#fafafa",
              padding: new go.Margin(padSm - 2, padMd, padSm - 2, padMd),
              visible: true,
            },
            $(go.TextBlock, { ...textStyle, stroke: "#6b7280" }, "Atributos")
          ),
          // Lista de atributos
          $(
            go.Panel,
            "Vertical",
            {
              row: 3,
              padding: new go.Margin(padSm - 2, padMd, padSm, padMd),
              defaultAlignment: go.Spot.Left,
            },
            new go.Binding("itemArray", "attributes").makeTwoWay(),
            {
              itemTemplate: $(
                go.Panel,
                "Horizontal",
                $(
                  go.TextBlock,
                  { ...textStyle, editable: true },
                  new go.Binding(
                    "text",
                    "",
                    (a) =>
                      `${a.name}: ${a.type || "string"}${
                        a.nullable ? "" : " !"
                      }`
                  ).makeTwoWay((t, data) => {
                    const m = String(t)
                      .trim()
                      .match(/^([^:]+):\s*([^!]+)(\s*!?)$/);
                    if (m) {
                      data.name = m[1].trim();
                      data.type = m[2].trim();
                      data.nullable = !m[3];
                    }
                    return data;
                  })
                )
              ),
            }
          ),
          // Encabezado operaciones (visible si hay operaciones)
          $(
            go.Panel,
            "Auto",
            {
              row: 4,
              background: "#fafafa",
              padding: new go.Margin(padSm - 2, padMd, padSm - 2, padMd),
              visible: false,
            },
            new go.Binding(
              "visible",
              "operations",
              (ops) => Array.isArray(ops) && ops.length > 0
            ),
            $(go.TextBlock, { ...textStyle, stroke: "#6b7280" }, "Operaciones")
          ),
          // Lista de operaciones
          $(
            go.Panel,
            "Vertical",
            {
              row: 5,
              padding: new go.Margin(padSm - 2, padMd, padMd, padMd),
              defaultAlignment: go.Spot.Left,
              visible: false,
            },
            new go.Binding(
              "visible",
              "operations",
              (ops) => Array.isArray(ops) && ops.length > 0
            ),
            new go.Binding("itemArray", "operations").makeTwoWay(),
            {
              itemTemplate: $(
                go.Panel,
                "Horizontal",
                $(
                  go.TextBlock,
                  { ...textStyle, editable: true },
                  new go.Binding(
                    "text",
                    "",
                    (m) =>
                      `${m.visibility ?? "+"}${m.name}(${(m.params || []).join(
                        ", "
                      )}) : ${m.type ?? "void"}`
                  ).makeTwoWay((t, d) => {
                    // Formato simple: +metodo(p1: T, p2: U) : Tipo
                    d.raw = String(t);
                    return d;
                  })
                )
              ),
            }
          )
        )
      ),
      makePort("T", go.Spot.Top, true, true),
      makePort("L", go.Spot.Left, true, true),
      makePort("R", go.Spot.Right, true, true),
      makePort("B", go.Spot.Bottom, true, true)
    )
  );

  // Junction, Interface, Enum, Note… (sin cambios)
  // ...
  return map;
}

// ---- dataset para categorías (puedes ampliarlo cuando sumes templates)
const PALETTE_SETS = {
  uml: [
    {
      key: "ClassTemplate",
      category: "class",
      name: "Clase",
      attributes: [{ name: "id", type: "int", nullable: false }],
    },
    {
      key: "AbstractClass",
      category: "class",
      name: "Abstracto",
      abstract: true,
      attributes: [{ name: "id", type: "int", nullable: false }],
    },
    {
      key: "AssocClass",
      category: "class",
      name: "AssociationClass",
      stereotype: "associationClass",
    },
    {
      key: "ValueObject",
      category: "class",
      name: "ValueObject",
      stereotype: "valueObject",
    },
  ],
  er: [
    {
      key: "Entity",
      category: "class",
      name: "Entity",
      attributes: [{ name: "id", type: "PK", nullable: false }],
    },
    {
      key: "WeakEnt",
      category: "class",
      name: "WeakEntity",
      attributes: [{ name: "id", type: "PK" }],
    },
  ],
  basico: [],
};

// ---- util: deduplicar por “firma” (category|isGroup|name|stereotype)
function uniqueItems(items) {
  const seen = new Set();
  return items.filter((it) => {
    const sig = `${it.category ?? "group"}|${!!it.isGroup}|${
      it.name ?? it.text ?? ""
    }|${it.stereotype ?? ""}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

// gojsTemplates.js
export function createPalette(mode = "grid") {
  return createPaletteFor("all", mode);
}

export function createPaletteFor(category, mode = "grid") {
  const $ = go.GraphObject.make;
  const clone = (o) => JSON.parse(JSON.stringify(o)); // profundo para evitar referencias

  const raw =
    category === "all"
      ? [
          ...(PALETTE_SETS.uml || []),
          ...(PALETTE_SETS.er || []),
          ...(PALETTE_SETS.basico || []),
        ]
      : PALETTE_SETS[category] || [];

  const items = uniqueItems(raw).map(clone);

  const isGrid = mode === "grid";
  const spacing = isGrid ? new go.Size(6, 6) : new go.Size(8, 10);
  const wrapCol = isGrid ? 4 : 1;
  const scale = isGrid ? 0.78 : 1;

  const pal = $(go.Palette, {
    allowDragOut: true,
    allowHorizontalScroll: false,
    allowZoom: false,
    isReadOnly: true,
    contentAlignment: go.Spot.Top,
    padding: isGrid ? new go.Margin(4, 4, 4, 4) : new go.Margin(6, 6, 6, 6),
    "toolManager.mouseWheelBehavior": go.ToolManager.WheelScroll,
    layout: $(go.GridLayout, {
      wrappingColumn: wrapCol,
      alignment: go.GridLayout.Position,
      spacing,
    }),
  });

  pal.nodeTemplateMap = makeNodeTemplateMap({ compact: isGrid });
  pal.groupTemplate = makeGroupTemplate();

  const model = new go.GraphLinksModel();
  model.nodeDataArray = items;
  model.copiesArrays = model.copiesArrayObjects = true;

  pal.model = model;
  pal.scale = scale;
  return pal;
}

function makeGroupTemplate() {
  const $ = go.GraphObject.make;
  const textStyle = {
    font: "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    stroke: "#1f2937",
  };

  return $(
    go.Group,
    "Vertical",
    {
      computesBoundsAfterDrag: true,
      isSubGraphExpanded: true,
      movable: true,                  // 👈
      locationSpot: go.Spot.Center,   // opcional
      layout: $(go.GridLayout, {
        wrappingColumn: 1,
        spacing: new go.Size(8, 8),
      }),
    },
    $(
      go.Panel,
      "Auto",
      $(go.Shape, "RoundedRectangle", { fill: "#eef2ff", stroke: "#3730a3" }),
      $(
        go.Panel,
        "Vertical",
        { margin: 4 },
        $(
          go.TextBlock,
          {
            ...textStyle,
            font: "bold 12px system-ui",
            margin: new go.Margin(6, 8, 2, 8),
            editable: true,
          },
          new go.Binding("text", "name").makeTwoWay()
        ),
        $(go.Placeholder, { padding: 8 })
      )
    )
  );
}

function applyLinkTemplates(diagram) {
  const $ = go.GraphObject.make;

  // ---------- estilos y contenedor HTML del menú (inyectados una sola vez) ----------
  (function ensureMenuOnce() {
    if (!document.getElementById("gojsLinkMenuStyle")) {
      const style = document.createElement("style");
      style.id = "gojsLinkMenuStyle";
      style.textContent = `
      .gojs-menu{position:absolute;z-index:1000;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 10px 25px rgba(0,0,0,.08);width:200px;padding:4px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
      .gojs-menu.hidden{display:none}
      .gojs-menu-scroller{max-height:200px;overflow-y:auto;overscroll-behavior:contain}
      .gojs-item{display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:6px;cursor:pointer;color:#111827;font-size:12px;line-height:1;white-space:nowrap}
      .gojs-item:hover{background:#f3f4f6}
      .gojs-sep{height:1px;background:#e5e7eb;margin:4px 0}
      .gojs-title{color:#6b7280;font-weight:700;padding:2px 6px;font-size:11px}
      .gojs-check{color:#10b981;width:12px;text-align:center}
      .gojs-spacer{width:12px}
      .gojs-mini{color:#6b7280;font-size:11px}
      `;
      document.head.appendChild(style);
    }
    if (!document.getElementById("gojsLinkMenu")) {
      const div = document.createElement("div");
      div.id = "gojsLinkMenu";
      div.className = "gojs-menu hidden";
      div.innerHTML = `<div class="gojs-menu-scroller"></div>`;
      document.body.appendChild(div);
    }
  })();

  const menuDiv = document.getElementById("gojsLinkMenu");
  const scroller = menuDiv.querySelector(".gojs-menu-scroller");

  const baseLink = {
    routing: go.Link.AvoidsNodes,
    curve: go.Link.JumpGap,
    corner: 6,
    relinkableFrom: true,
    relinkableTo: true,
    selectionAdorned: true,
    fromShortLength: 6,
    toShortLength: 6,
    reshapable: true,
    resegmentable: true,
    adjusting: go.Link.End,
  };

  const normal = { stroke: "#111827", strokeWidth: 1.2 };
  const dashed = {
    strokeDashArray: [6, 4],
    stroke: "#111827",
    strokeWidth: 1.2,
  };

  const setCat = (cat) => (e, obj) =>
    e.diagram.model.setCategoryForLinkData(obj.part.data, cat);

  const setMul = (fromMul, toMul) => (e, obj) => {
    const m = e.diagram.model;
    m.startTransaction("set multiplicity");
    m.setDataProperty(obj.part.data, "fromMultiplicity", fromMul);
    m.setDataProperty(obj.part.data, "toMultiplicity", toMul);
    m.commitTransaction("set multiplicity");
  };

  // ---------- helpers de labels ----------
  function withMultiplicity(shapeDef, arrowDef) {
    return [
      shapeDef,
      arrowDef,
      $(
        go.Panel,
        "Auto",
        {
          alignment: new go.Spot(0.1, -0.1),
          alignmentFocus: go.Spot.BottomRight,
          segmentIndex: 0,
          segmentFraction: 0.05,
        },
        $(
          go.TextBlock,
          {
            font: "11px system-ui",
            stroke: "#111827",
            background: "rgba(255,255,255,.8)",
            editable: true,
            margin: 1,
          },
          new go.Binding("text", "fromMultiplicity").makeTwoWay()
        )
      ),
      $(
        go.Panel,
        "Auto",
        {
          alignment: new go.Spot(0.9, 1.1),
          alignmentFocus: go.Spot.TopLeft,
          segmentIndex: -1,
          segmentFraction: 0.95,
        },
        $(
          go.TextBlock,
          {
            font: "11px system-ui",
            stroke: "#111827",
            background: "rgba(255,255,255,.8)",
            editable: true,
            margin: 1,
          },
          new go.Binding("text", "toMultiplicity").makeTwoWay()
        )
      ),
    ];
  }

  // ---------- HTML context menu con scroll y mejor posicionamiento ----------
  const htmlMenuInfo = $(go.HTMLInfo, {
    show: (obj, diagram, tool) => {
      const part = obj.part;
      const data = part?.data || {};
      const cat = data.category || "association";

      scroller.innerHTML = "";

      const mkItem = (
        label,
        onClick,
        { checked = false, mini = false } = {}
      ) => {
        const div = document.createElement("div");
        div.className = "gojs-item" + (mini ? " gojs-mini" : "");
        const chk = document.createElement("span");
        chk.className = checked ? "gojs-check" : "gojs-spacer";
        chk.textContent = checked ? "✓" : "";
        const text = document.createElement("span");
        text.textContent = label;
        div.appendChild(chk);
        div.appendChild(text);
        div.onclick = (ev) => {
          ev.preventDefault();
          onClick();
          htmlMenuInfo.hide(diagram, tool);
        };
        return div;
      };
      const mkSep = () => {
        const d = document.createElement("div");
        d.className = "gojs-sep";
        return d;
      };
      const mkTitle = (t) => {
        const d = document.createElement("div");
        d.className = "gojs-title";
        d.textContent = t;
        return d;
      };

      // Tipos UML
      scroller.appendChild(
        mkItem("Association", () => setCat("association")(tool, obj), {
          checked: cat === "association",
        })
      );
      scroller.appendChild(
        mkItem("Aggregation ◊", () => setCat("aggregation")(tool, obj), {
          checked: cat === "aggregation",
        })
      );
      scroller.appendChild(
        mkItem("Composition ♦", () => setCat("composition")(tool, obj), {
          checked: cat === "composition",
        })
      );
      scroller.appendChild(
        mkItem("Generalization ▷", () => setCat("generalization")(tool, obj), {
          checked: cat === "generalization",
        })
      );
      scroller.appendChild(
        mkItem("Realization --▷", () => setCat("realization")(tool, obj), {
          checked: cat === "realization",
        })
      );
      scroller.appendChild(
        mkItem("Dependency --▷", () => setCat("dependency")(tool, obj), {
          checked: cat === "dependency",
        })
      );

      scroller.appendChild(mkSep());
      scroller.appendChild(mkTitle("Cardinalidad"));

      // Cardinalidades
      const mul = (a, b) => () => setMul(a, b)(tool, obj);
      [
        ["1", "1"],
        ["1", "*"],
        ["*", "1"],
        ["*", "*"],
        ["0..1", "1"],
        ["0..1", "*"],
        ["1", "0..1"],
        ["*", "0..1"],
        ["0..*", "1"],
        ["1", "0..*"],
        ["0..*", "0..*"],
      ].forEach(([a, b]) => {
        scroller.appendChild(mkItem(`${a} — ${b}`, mul(a, b), { mini: true }));
      });

      scroller.appendChild(mkSep());
      scroller.appendChild(
        mkItem("Limpiar cardinalidad", () => setMul("", "")(tool, obj), {
          mini: true,
        })
      );
      scroller.appendChild(
        mkItem(
          "Intercambiar lados",
          () => {
            const m = diagram.model,
              d = part.data;
            m.startTransaction("swap multiplicity");
            const a = d.fromMultiplicity || "",
              b = d.toMultiplicity || "";
            m.setDataProperty(d, "fromMultiplicity", b);
            m.setDataProperty(d, "toMultiplicity", a);
            m.commitTransaction("swap multiplicity");
          },
          { mini: true }
        )
      );

      // ====== POSICIONAMIENTO CERCA DEL CLICK ======
      const vp = diagram.lastInput.viewPoint;
      const rect = diagram.div.getBoundingClientRect();
      let x = rect.left + window.pageXOffset + vp.x + 4;
      let y = rect.top + window.pageYOffset + vp.y + 4;

      // Evitar que el menú se salga de la ventana
      menuDiv.classList.remove("hidden");
      const mw = menuDiv.offsetWidth;
      const mh = menuDiv.offsetHeight;
      const vw = window.innerWidth + window.pageXOffset;
      const vh = window.innerHeight + window.pageYOffset;

      if (x + mw > vw - 8) x = Math.max(window.pageXOffset + 8, vw - mw - 8);
      if (y + mh > vh - 8) y = Math.max(window.pageYOffset + 8, vh - mh - 8);

      menuDiv.style.left = `${x}px`;
      menuDiv.style.top = `${y}px`;
    },
    hide: () => {
      menuDiv.classList.add("hidden");
    },
  });

  // Cerrar si clic fuera
  document.addEventListener("mousedown", (e) => {
    if (!menuDiv.classList.contains("hidden") && !menuDiv.contains(e.target)) {
      menuDiv.classList.add("hidden");
    }
  });

  // ---------- plantillas de enlaces ----------
  diagram.linkTemplateMap.add(
    "association",
    $(
      go.Link,
      baseLink,
      new go.Binding("points").makeTwoWay(),
      { contextMenu: htmlMenuInfo },
      ...withMultiplicity($(go.Shape, normal), $(go.Shape, { toArrow: "" }))
    )
  );
  diagram.linkTemplateMap.add(
    "aggregation",
    $(
      go.Link,
      baseLink,
      new go.Binding("points").makeTwoWay(),
      { contextMenu: htmlMenuInfo },
      ...withMultiplicity(
        $(go.Shape, normal),
        $(go.Shape, { fromArrow: "Diamond", fill: "white", stroke: "#111827" })
      )
    )
  );
  diagram.linkTemplateMap.add(
    "composition",
    $(
      go.Link,
      baseLink,
      new go.Binding("points").makeTwoWay(),
      { contextMenu: htmlMenuInfo },
      ...withMultiplicity(
        $(go.Shape, normal),
        $(go.Shape, {
          fromArrow: "Diamond",
          fill: "#111827",
          stroke: "#111827",
        })
      )
    )
  );
  diagram.linkTemplateMap.add(
    "generalization",
    $(
      go.Link,
      baseLink,
      new go.Binding("points").makeTwoWay(),
      { contextMenu: htmlMenuInfo },
      ...withMultiplicity(
        $(go.Shape, normal),
        $(go.Shape, { toArrow: "Triangle", fill: "white", stroke: "#111827" })
      )
    )
  );
  diagram.linkTemplateMap.add(
    "realization",
    $(
      go.Link,
      baseLink,
      new go.Binding("points").makeTwoWay(),
      { contextMenu: htmlMenuInfo },
      ...withMultiplicity(
        $(go.Shape, dashed),
        $(go.Shape, { toArrow: "Triangle", fill: "white", stroke: "#111827" })
      )
    )
  );
  diagram.linkTemplateMap.add(
    "dependency",
    $(
      go.Link,
      baseLink,
      new go.Binding("points").makeTwoWay(),
      { contextMenu: htmlMenuInfo },
      ...withMultiplicity(
        $(go.Shape, dashed),
        $(go.Shape, { toArrow: "OpenTriangle" })
      )
    )
  );

  diagram.linkTemplate = diagram.linkTemplateMap.get("association");
}

// ---- API pública

export function createDiagram() {
  const $ = go.GraphObject.make;

  const diagram = $(go.Diagram, {
    allowDrop: true,
    "undoManager.isEnabled": true,
    // 👇 más densidad y mejor navegación
    padding: 8,
    contentAlignment: go.Spot.Center,
    minScale: 0.35,
    maxScale: 2,
    "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom, // rueda = zoom
    "draggingTool.isGridSnapEnabled": true,
    "draggingTool.gridSnapCellSize": new go.Size(12, 12),
    "grid.visible": true,
    "linkingTool.isUnconnectedLinkValid": true,
    "relinkingTool.isUnconnectedLinkValid": true,
    "toolManager.hoverDelay": 50,
    isEnabled: true,
    isReadOnly: false,
    allowMove: true,
    allowCopy: true,
    allowDelete: true,
    allowLink: true,
    "undoManager.isEnabled": true,
    "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,
  });
  diagram.toolManager.draggingTool.isEnabled = true; // refuerzo extra

  // 👇 Grid: líneas menores/mayores más apretadas
  diagram.grid = $(
    go.Panel,
    "Grid",
    { gridCellSize: new go.Size(12, 12) },
    $(go.Shape, "LineH", { stroke: "#eceff1", strokeWidth: 0.5 }),
    $(go.Shape, "LineV", { stroke: "#eceff1", strokeWidth: 0.5 }),
    $(go.Shape, "LineH", { interval: 8, stroke: "#dfe3e6", strokeWidth: 0.75 }),
    $(go.Shape, "LineV", { interval: 8, stroke: "#dfe3e6", strokeWidth: 0.75 })
  );

  diagram.nodeTemplateMap = makeNodeTemplateMap(); // (ver #2 abajo para compactar)
  diagram.groupTemplate = makeGroupTemplate();
  applyLinkTemplates(diagram);

  const model = new go.GraphLinksModel();
  model.nodeKeyProperty = "key";
  model.linkKeyProperty = "key";
  model.linkCategoryProperty = "category";
  model.copiesArrays = true;
  model.copiesArrayObjects = true;

  diagram.model = model;

  // 👇 Ajusta vista al contenido inicial
  diagram.addDiagramListener("InitialLayoutCompleted", () => {
    if (diagram.nodes.count > 0) diagram.zoomToFit();
  });

  return diagram;
}
