import { useCallback, useMemo } from "react";
import type { Coordinate, Dimensions, HierarchyNode, PlacedNode, SizeFn } from "../types";

export type MinimapProps<T extends HierarchyNode> = {
  /** All placed nodes from layout */
  nodes: PlacedNode<T>[];
  /** Size function for nodes */
  nodeSize: SizeFn<T>;
  /** Current viewport state */
  viewport: {
    pan: Coordinate;
    zoom: number;
    width: number;
    height: number;
  };
  /** Callback to navigate to position (sets new pan) */
  onNavigate?: (pan: Coordinate) => void;
  /** Minimap dimensions (default: { width: 200, height: 150 }) */
  size?: Dimensions;
  /** Position on canvas */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Background color */
  backgroundColor?: string;
  /** Node indicator color */
  nodeColor?: string;
  /** Viewport rectangle fill color */
  viewportColor?: string;
  /** Viewport rectangle stroke color */
  viewportStrokeColor?: string;
  /** Additional className */
  className?: string;
  /** Border radius for minimap (default: 4) */
  borderRadius?: number;
};

const DEFAULT_SIZE = { width: 200, height: 150 };
const DEFAULT_BG = "rgba(0, 0, 0, 0.05)";
const DEFAULT_NODE_COLOR = "rgba(100, 100, 100, 0.6)";
const DEFAULT_VIEWPORT_COLOR = "rgba(59, 130, 246, 0.2)";
const DEFAULT_VIEWPORT_STROKE = "rgba(59, 130, 246, 0.6)";
const PADDING = 20;

/**
 * Minimap component for overview navigation.
 * Shows a scaled-down view of all nodes with a viewport indicator.
 *
 * @example
 * ```tsx
 * <ZoomableCanvas onViewChange={setView}>
 *   {(view) => (
 *     <>
 *       <HierarchyView data={data} nodeSize={nodeSize} ... />
 *       <Minimap
 *         nodes={layout.nodes}
 *         nodeSize={nodeSize}
 *         viewport={{ ...view, width: canvasWidth, height: canvasHeight }}
 *         onNavigate={(pan) => setView(v => ({ ...v, pan }))}
 *         position="bottom-right"
 *       />
 *     </>
 *   )}
 * </ZoomableCanvas>
 * ```
 */
export function Minimap<T extends HierarchyNode>({
  nodes,
  nodeSize,
  viewport,
  onNavigate,
  size = DEFAULT_SIZE,
  position = "bottom-right",
  backgroundColor = DEFAULT_BG,
  nodeColor = DEFAULT_NODE_COLOR,
  viewportColor = DEFAULT_VIEWPORT_COLOR,
  viewportStrokeColor = DEFAULT_VIEWPORT_STROKE,
  className,
  borderRadius = 4,
}: MinimapProps<T>) {
  // Calculate content bounds
  const bounds = useMemo(() => {
    if (nodes.length === 0) {
      return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      const s = nodeSize(node.data);
      minX = Math.min(minX, node.position.x - s.width / 2);
      maxX = Math.max(maxX, node.position.x + s.width / 2);
      minY = Math.min(minY, node.position.y - s.height / 2);
      maxY = Math.max(maxY, node.position.y + s.height / 2);
    }

    return { minX, maxX, minY, maxY };
  }, [nodes, nodeSize]);

  // Calculate scale to fit content in minimap
  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;
  const scale = Math.min(
    (size.width - PADDING * 2) / Math.max(contentWidth, 1),
    (size.height - PADDING * 2) / Math.max(contentHeight, 1)
  );

  // Transform content coordinates to minimap coordinates
  const toMinimap = useCallback(
    (pos: Coordinate): Coordinate => ({
      x: (pos.x - bounds.minX) * scale + PADDING,
      y: (pos.y - bounds.minY) * scale + PADDING,
    }),
    [bounds, scale]
  );

  // Handle click to navigate
  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!onNavigate) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Convert minimap click to canvas coordinates
      const canvasX = (clickX - PADDING) / scale + bounds.minX;
      const canvasY = (clickY - PADDING) / scale + bounds.minY;

      // Calculate pan to center clicked point
      const newPan: Coordinate = {
        x: viewport.width / 2 - canvasX * viewport.zoom,
        y: viewport.height / 2 - canvasY * viewport.zoom,
      };

      onNavigate(newPan);
    },
    [onNavigate, scale, bounds, viewport]
  );

  // Calculate viewport rectangle in minimap coordinates
  const viewportRect = useMemo(() => {
    // Current visible area in canvas coordinates
    const visibleX = -viewport.pan.x / viewport.zoom;
    const visibleY = -viewport.pan.y / viewport.zoom;
    const visibleWidth = viewport.width / viewport.zoom;
    const visibleHeight = viewport.height / viewport.zoom;

    // Convert to minimap coordinates
    const topLeft = toMinimap({ x: visibleX, y: visibleY });

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: visibleWidth * scale,
      height: visibleHeight * scale,
    };
  }, [viewport, toMinimap, scale]);

  // Position styles
  const positionStyles: React.CSSProperties = {
    position: "absolute",
    ...(position.includes("top") ? { top: 16 } : { bottom: 16 }),
    ...(position.includes("left") ? { left: 16 } : { right: 16 }),
    pointerEvents: "auto",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    borderRadius,
    overflow: "hidden",
  };

  return (
    <svg
      width={size.width}
      height={size.height}
      onClick={handleClick}
      style={{
        ...positionStyles,
        cursor: onNavigate ? "pointer" : "default",
      }}
      className={className}
    >
      {/* Background */}
      <rect
        fill={backgroundColor}
        width={size.width}
        height={size.height}
        rx={borderRadius}
      />

      {/* Nodes */}
      {nodes.map((node) => {
        const s = nodeSize(node.data);
        const pos = toMinimap(node.position);
        const nodeWidth = Math.max(s.width * scale, 4);
        const nodeHeight = Math.max(s.height * scale, 4);

        return (
          <rect
            key={node.data.id}
            x={pos.x - nodeWidth / 2}
            y={pos.y - nodeHeight / 2}
            width={nodeWidth}
            height={nodeHeight}
            fill={nodeColor}
            rx={2}
          />
        );
      })}

      {/* Viewport indicator */}
      <rect
        x={viewportRect.x}
        y={viewportRect.y}
        width={viewportRect.width}
        height={viewportRect.height}
        fill={viewportColor}
        stroke={viewportStrokeColor}
        strokeWidth={1.5}
        rx={2}
      />
    </svg>
  );
}
