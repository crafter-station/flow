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
