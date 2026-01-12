# @crafter/flow

A zero-dependency tree layout and infinite canvas library for React. Build interactive hierarchy visualizations with pan, zoom, and animated connections.

## Features

- **Hierarchy Layout Engine** - Pure layout calculation with vertical and horizontal directions
- **Zoomable Canvas** - Pan and zoom with momentum-based scrolling
- **Animated Edges** - Customizable animated paths between nodes with smooth corners
- **Flexible Rendering** - Bring your own node components via render props
- **TypeScript First** - Full type safety with generics support
- **Zero Runtime Dependencies** - Only React as a peer dependency

## Installation

```bash
npm install @crafter/flow
# or
pnpm add @crafter/flow
# or
bun add @crafter/flow
```

## Quick Start

```tsx
import { ZoomableCanvas, HierarchyView, type HierarchyNode } from "@crafter/flow";

// Define your node type
type MyNode = HierarchyNode & {
  label: string;
  kind: "root" | "folder" | "file";
};

// Create your hierarchy data
const data: MyNode = {
  id: "1",
  label: "Root",
  kind: "root",
  children: [
    {
      id: "2",
      label: "Folder A",
      kind: "folder",
      children: [
        { id: "4", label: "File 1", kind: "file" },
        { id: "5", label: "File 2", kind: "file" },
      ],
    },
    { id: "3", label: "Folder B", kind: "folder" },
  ],
};

// Define node sizes
const nodeSize = (node: MyNode) => {
  if (node.kind === "root") return { width: 120, height: 40 };
  if (node.kind === "folder") return { width: 150, height: 60 };
  return { width: 120, height: 50 };
};

// Render
function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ZoomableCanvas backgroundColor="#f5f5f5">
        <HierarchyView<MyNode>
          data={data}
          nodeSize={nodeSize}
          gap={{ x: 50, y: 80 }}
          edgeColor="#888"
          renderNode={(node) => (
            <div
              style={{
                padding: "8px 16px",
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              {node.label}
            </div>
          )}
          onNodeClick={(node) => console.log("Clicked:", node)}
        />
      </ZoomableCanvas>
    </div>
  );
}
```

## API Reference

### `<ZoomableCanvas />`

Pan and zoom container for canvas content.

```tsx
<ZoomableCanvas
  minZoom={0.5}            // Minimum zoom level (default: 0.5)
  maxZoom={3}              // Maximum zoom level (default: 3)
  initialZoom={1}          // Initial zoom (default: 1)
  zoomSensitivity={0.001}  // Zoom sensitivity (default: 0.001)
  showGrid={true}          // Show dot grid pattern (default: true)
  gridSpacing={15}         // Grid dot spacing (default: 15)
  dotSize={1.5}            // Grid dot size (default: 1.5)
  dotColor="#888"          // Grid dot color
  backgroundColor="#fff"   // Canvas background color
  overlay={<Controls />}   // Fixed overlay (not affected by pan/zoom)
  renderError={(error, retry) => <ErrorUI />}  // Custom error UI
>
  {/* Canvas content */}
</ZoomableCanvas>
```

### `<HierarchyView />`

Hierarchy visualization with automatic layout.

```tsx
<HierarchyView<MyNode>
  data={rootNode}                      // Root node of hierarchy
  nodeSize={(node) => size}            // Required: returns { width, height }
  gap={{ x: 50, y: 50 }}               // Gap between nodes
  config={{
    direction: "vertical",             // "vertical" or "horizontal"
    tuning: {
      indent: 60,                      // Child indent for vertical layout
      verticalShift: -25,              // Vertical adjustment
      compression: 0.4,                // Subtree packing (0-1)
    },
  }}
  edgeAnimation={{ style: "dots" }}    // Animation style
  edgeColor="#888"                     // Edge color
  renderNode={(node, parent) => JSX}   // Required: node renderer
  renderEdge={(waypoints, src, tgt) => JSX}  // Optional: custom edge renderer
  onNodeClick={(node) => void}         // Node click handler
/>
```

### `<EdgePath />`

Animated edge with rounded corners.

```tsx
<EdgePath
  waypoints={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}  // Path waypoints
  animation={{ style: "dots" }}   // Animation config
  color="#888"                    // Stroke color
/>
```

**Animation Styles:**
- `dots` - Small animated dots (default)
- `dashes` - Dashed line animation
- `dots-slow` - Slower dot animation
- `dashes-fast` - Fast dash animation
- `pulse` - Pulsing effect

**Custom Animation:**
```tsx
animation={{
  custom: {
    dash: 4,
    gap: 8,
    duration: 2,       // seconds per cycle
    width: 3,
    color: "#3b82f6",
  }
}}
```

### `HierarchyGraph`

Low-level layout calculation for advanced use cases.

```tsx
import { HierarchyGraph, type HierarchyNode } from "@crafter/flow";

const graph = new HierarchyGraph<MyNode>({
  gap: { x: 50, y: 50 },
  direction: "vertical",
});

// Register sizes for all nodes
for (const node of getAllNodes(root)) {
  graph.registerSize(node.id, { width: 200, height: 80 });
}

// Compute layout
const { nodes, edges } = graph.compute(root);
// nodes: Array of { data, position: { x, y }, depth }
// edges: Array of { source, target, waypoints: Coordinate[] }
```

### SVG Utilities

Path command helpers for custom edge rendering.

```tsx
import { compilePath, moveTo, lineTo, curveTo } from "@crafter/flow";

const d = compilePath([
  moveTo({ x: 0, y: 0 }),
  lineTo({ x: 100, y: 0 }),
  curveTo({ x: 150, y: 0 }, { x: 150, y: 50 }),
  lineTo({ x: 150, y: 100 }),
]);

<path d={d} stroke="#888" fill="none" />
```

## Types

```tsx
import type {
  HierarchyNode,      // Base node interface (extend this)
  Coordinate,         // { x: number; y: number }
  PlacedNode,         // Node with calculated position
  GraphConfig,        // Layout configuration
  SizeFn,             // (node: T) => { width, height }
  Edge,               // Source-target edge with waypoints
} from "@crafter/flow";
```

## Styling

The library uses inline styles by default. Customize appearance via:

1. **Props** - `backgroundColor`, `dotColor`, `edgeColor`, etc.
2. **CSS Variables** - Override in your CSS:
   ```css
   :root {
     --flow-canvas-bg: #f5f5f5;
     --flow-grid-dot: rgba(0, 0, 0, 0.1);
     --flow-edge: #888;
   }
   ```
3. **className props** - Pass Tailwind/CSS classes to components

## License

MIT
