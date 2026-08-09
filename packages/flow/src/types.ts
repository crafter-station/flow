/**
 * Represents a coordinate in 2D space.
 */
export type Coordinate = {
  x: number;
  y: number;
};

/**
 * Dimensions of a rectangular element.
 */
export type Dimensions = {
  width: number;
  height: number;
};

/**
 * Base interface for hierarchical nodes. Extend this with your own
 * properties to create custom node types.
 *
 * @example
 * ```typescript
 * type FileSystemNode = HierarchyNode & {
 *   name: string;
 *   kind: "directory" | "file";
 * };
 * ```
 */
export type HierarchyNode = {
  /** Unique identifier for the node */
  id: string;
  /** Flow direction for this node's children. Overrides parent direction. */
  direction?: "vertical" | "horizontal";
  /** Child nodes */
  children?: HierarchyNode[];
  /** Allow additional properties for extension */
  [key: string]: unknown;
};

/**
 * A node with its calculated position after layout.
 */
export type PlacedNode<T extends HierarchyNode> = {
  data: T;
  position: Coordinate;
  depth: number;
};

/**
 * Edge connecting two nodes with a path.
 */
export type Edge<T extends HierarchyNode> = {
  source: T;
  target: T;
  waypoints: Coordinate[];
  /**
   * How this edge relates to the layout.
   *
   * `"tree"` edges follow the parent/child links the layout was built from.
   * `"cross"` edges are extra relations supplied via `GraphConfig.links`:
   * they are drawn between placed nodes but never move them.
   *
   * Absent on edges produced before this field existed; treat as `"tree"`.
   */
  kind?: EdgeKind;
};

export type EdgeKind = "tree" | "cross";

/**
 * A relation between two nodes that the tree layout cannot express, such as a
 * node with more than one parent. Both ids must already be placed by the
 * layout; a link naming an unplaced node is ignored.
 */
export type NodeLink = {
  source: string;
  target: string;
};

/**
 * Configuration for the graph layout algorithm.
 */
export type GraphConfig = {
  /** Gap between nodes */
  gap: { x: number; y: number };
  /** Default flow direction (default: "horizontal") */
  direction?: "vertical" | "horizontal";
  /** Fine-tuning options */
  tuning?: {
    /** Indentation for nested nodes (default: 60) */
    indent?: number;
    /** Vertical shift adjustment (default: -25) */
    verticalShift?: number;
    /** Compression factor for subtrees (default: 0.4) */
    compression?: number;
    /** Sibling gap multiplier (default: 0.833) */
    siblingFactor?: number;
  };
  /** Edge path options */
  edges?: {
    vertical?: {
      /** Spine offset from parent (default: 0) */
      spineOffset?: number;
      /** Spine spacing adjustment (default: 20) */
      spineGap?: number;
    };
  };
  /**
   * Extra relations to draw on top of the tree, for data that is a graph
   * rather than a hierarchy (a node with several parents, a reference back
   * to an ancestor).
   *
   * These never affect node positions: the layout stays a tree, and each link
   * becomes an `Edge` with `kind: "cross"` between two already-placed nodes.
   * Links naming a node the layout did not place are skipped.
   */
  links?: NodeLink[];
};

/**
 * Result of running the layout algorithm.
 */
export type GraphResult<T extends HierarchyNode> = {
  nodes: PlacedNode<T>[];
  edges: Edge<T>[];
};

/**
 * Function to determine the size of a node.
 * Called for every node during layout calculation.
 *
 * @example
 * ```typescript
 * const measureNode: SizeFn<MyNode> = (node) => {
 *   if (node.kind === "directory") {
 *     return { width: 200, height: 100 };
 *   }
 *   return { width: 150, height: 60 };
 * };
 * ```
 */
export type SizeFn<T extends HierarchyNode> = (node: T) => Dimensions;

// ============================================================================
// Drag-and-Drop Types
// ============================================================================

/**
 * Drag mode configuration for nodes.
 * - "node": Drag only the selected node
 * - "subtree": Drag the node and all its descendants
 * - false: Disable dragging
 */
export type DragMode = "node" | "subtree" | false;

/**
 * Map of node IDs to position overrides.
 * When a node has an override, it uses this position instead of the calculated one.
 */
export type PositionOverrides = Map<string, Coordinate>;

/**
 * Event fired when a node drag operation ends.
 */
export type NodeDragEvent<T extends HierarchyNode> = {
  /** The dragged node */
  node: T;
  /** All nodes that were moved (node itself, or subtree if dragMode="subtree") */
  affectedNodes: T[];
  /** The delta from original position */
  delta: Coordinate;
  /** New position for the dragged node */
  newPosition: Coordinate;
};

// ============================================================================
// View State Types
// ============================================================================

/**
 * Current view state of the canvas (pan and zoom).
 */
export type ViewState = {
  zoom: number;
  pan: Coordinate;
};

// ============================================================================
// Export Types
// ============================================================================

/**
 * Exported data structure containing all graph information.
 */
export type ExportData<T extends HierarchyNode> = {
  nodes: Array<{
    id: string;
    data: T;
    position: Coordinate;
    size: Dimensions;
  }>;
  edges: Array<{
    sourceId: string;
    targetId: string;
    waypoints: Coordinate[];
  }>;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
};
