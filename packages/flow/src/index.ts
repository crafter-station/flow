// Types
export type {
  Coordinate,
  Dimensions,
  HierarchyNode,
  PlacedNode,
  Edge,
  GraphConfig,
  GraphResult,
  SizeFn,
} from "./types";

// Core
export { HierarchyGraph, ensure } from "./core/hierarchy-graph";

// Components
export { ZoomableCanvas } from "./components/zoomable-canvas";
export type { ZoomableCanvasProps } from "./components/zoomable-canvas";

export { DotGrid } from "./components/dot-grid";
export type { DotGridProps } from "./components/dot-grid";

export { ErrorBoundary } from "./components/error-boundary";
export type { ErrorBoundaryProps } from "./components/error-boundary";

export { HierarchyView } from "./components/hierarchy-view";
export type { HierarchyViewProps } from "./components/hierarchy-view";

export { NodeContainer } from "./components/node-container";
export type { NodeContainerProps } from "./components/node-container";

export { EdgePath, EDGE_STYLES } from "./components/edge-path";
export type {
  EdgePathProps,
  EdgeConfig,
  EdgeStyle,
  EdgeAnimation,
} from "./components/edge-path";

// SVG Utilities
export {
  compilePath,
  moveTo,
  lineTo,
  curveTo,
} from "./svg/path-builder";
export type {
  DrawCommand,
  MoveCommand,
  LineCommand,
  CurveCommand,
} from "./svg/path-builder";
