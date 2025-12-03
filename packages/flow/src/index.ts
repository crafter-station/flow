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
  // Drag-and-drop types
  DragMode,
  PositionOverrides,
  NodeDragEvent,
  // View state
  ViewState,
  // Export types
  ExportData,
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

export { DraggableNodeContainer } from "./components/draggable-node-container";
export type { DraggableNodeContainerProps } from "./components/draggable-node-container";

export { Minimap } from "./components/minimap";
export type { MinimapProps } from "./components/minimap";

export { EdgePath, EDGE_STYLES } from "./components/edge-path";
export type {
  EdgePathProps,
  EdgeConfig,
  EdgeStyle,
  EdgeAnimation,
} from "./components/edge-path";

// Hooks
export { useKeyboardNavigation } from "./hooks/use-keyboard-navigation";
export type { KeyboardNavigationOptions } from "./hooks/use-keyboard-navigation";

export { useExport } from "./hooks/use-export";
export type { UseExportOptions, UseExportResult } from "./hooks/use-export";

// Export Utilities
export {
  exportToJson,
  exportToPng,
  downloadBlob,
  downloadJson,
} from "./utils/export";
export type { ExportOptions } from "./utils/export";

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
