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
      },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(
        go.Point.stringify
      ),
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
      attributes: [{ name: "id", type: "uuid", nullable: false }],
    },
    {
      key: "AbstractClass",
      category: "class",
      name: "Abstracto",
      abstract: true,
      attributes: [{ name: "id", type: "uuid", nullable: false }],
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
    {
      key: "Service",
      category: "class",
      name: "Service",
      stereotype: "service",
      operations: [{ name: "execute", type: "void" }],
    },
    { key: "IFaceTemplate", category: "interface", name: "Interfaz" },
    {
      key: "EnumTemplate",
      category: "enum",
      name: "Enum",
      literals: [{ name: "A" }, { name: "B" }],
    },
    { key: "PackageTemplate", isGroup: true, name: "Paquete" },
    { key: "NoteTemplate", category: "note", text: "Nota..." },
    { key: "JunctionTemplate", category: "junction" },
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
    { key: "NoteER", category: "note", text: "Attribute" },
    { key: "DotER", category: "junction" },
  ],
  basico: [
    { key: "Note", category: "note", text: "Nota..." },
    { key: "Dot", category: "junction" },
    { key: "Pkg", isGroup: true, name: "Grupo" },
  ],
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

  const baseLink = {
    routing: go.Link.AvoidsNodes,
    curve: go.Link.JumpGap,
    corner: 6,
    relinkableFrom: true,
    relinkableTo: true,
    selectionAdorned: true,
    fromShortLength: 6,
    toShortLength: 6,
  };

  const normal = { stroke: "#111827", strokeWidth: 1.2 };
  const dashed = {
    strokeDashArray: [6, 4],
    stroke: "#111827",
    strokeWidth: 1.2,
  };

  const setCat = (cat) => (e, obj) =>
    e.diagram.model.setCategoryForLinkData(obj.part.data, cat);

  const linkContextMenu = $(
    "ContextMenu",
    $("ContextMenuButton", $(go.TextBlock, "Association"), {
      click: setCat("association"),
    }),
    $("ContextMenuButton", $(go.TextBlock, "Aggregation ◊"), {
      click: setCat("aggregation"),
    }),
    $("ContextMenuButton", $(go.TextBlock, "Composition ♦"), {
      click: setCat("composition"),
    }),
    $("ContextMenuButton", $(go.TextBlock, "Generalization ▷"), {
      click: setCat("generalization"),
    }),
    $("ContextMenuButton", $(go.TextBlock, "Realization --▷"), {
      click: setCat("realization"),
    }),
    $("ContextMenuButton", $(go.TextBlock, "Dependency --▷"), {
      click: setCat("dependency"),
    })
  );

  // helper: añade labels de multiplicidad
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

  diagram.linkTemplateMap.add(
    "association",
    $(
      go.Link,
      baseLink,
      { contextMenu: linkContextMenu },
      ...withMultiplicity($(go.Shape, normal), $(go.Shape, { toArrow: "" }))
    )
  );

  diagram.linkTemplateMap.add(
    "aggregation",
    $(
      go.Link,
      baseLink,
      { contextMenu: linkContextMenu },
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
      { contextMenu: linkContextMenu },
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
      { contextMenu: linkContextMenu },
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
      { contextMenu: linkContextMenu },
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
      { contextMenu: linkContextMenu },
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
  });

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
