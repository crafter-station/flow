import type {
  Coordinate,
  Dimensions,
  Edge,
  GraphConfig,
  GraphResult,
  HierarchyNode,
  PlacedNode,
} from "../types";

/**
 * Graph layout calculator for hierarchical structures.
 * Computes positions for nodes and generates edge paths.
 *
 * @example
 * ```typescript
 * const graph = new HierarchyGraph<MyNode>({
 *   gap: { x: 50, y: 50 },
 *   direction: "vertical",
 * });
 *
 * // Register sizes for all nodes
 * for (const node of getAllNodes(root)) {
 *   graph.registerSize(node.id, { width: 200, height: 100 });
 * }
 *
 * // Run layout
 * const { nodes, edges } = graph.compute(root);
 * ```
 */
export class HierarchyGraph<T extends HierarchyNode> {
  private settings: Required<GraphConfig> & {
    tuning: Required<Required<GraphConfig>["tuning"]>;
    edges: Required<Required<GraphConfig>["edges"]> & {
      vertical: Required<Required<Required<GraphConfig>["edges"]>["vertical"]>;
    };
  };
  private sizes: Map<string, Dimensions>;

  constructor(config: GraphConfig) {
    this.settings = {
      gap: config.gap,
      direction: config.direction ?? "horizontal",
      tuning: {
        indent: config.tuning?.indent ?? 60,
        verticalShift: config.tuning?.verticalShift ?? -25,
        compression: config.tuning?.compression ?? 0.4,
        siblingFactor: config.tuning?.siblingFactor ?? 0.833,
      },
      edges: {
        vertical: {
          spineOffset: config.edges?.vertical?.spineOffset ?? 0,
          spineGap: config.edges?.vertical?.spineGap ?? 20,
        },
      },
    };

    this.validateSettings();
    this.sizes = new Map();
  }

  private validateSettings(): void {
    ensure(this.settings.tuning.indent !== undefined, "Tuning indent must be defined");
    ensure(this.settings.tuning.verticalShift !== undefined, "Tuning verticalShift must be defined");
    ensure(this.settings.tuning.compression !== undefined, "Tuning compression must be defined");
    ensure(this.settings.tuning.siblingFactor !== undefined, "Tuning siblingFactor must be defined");
    ensure(this.settings.edges.vertical.spineGap !== undefined, "Edge spineGap must be defined");
  }

  /**
   * Register measured size for a node.
   * Must be called for all nodes before compute().
   */
  registerSize(id: string, size: Dimensions): void {
    this.sizes.set(id, size);
  }

  /**
   * Check if all nodes have registered sizes.
   */
  isReady(root: T): boolean {
    return this.traverse(root).every((n) => this.sizes.has(n.id));
  }

  /**
   * Compute positions for all nodes and generate edge paths.
   * @throws Error if any node is missing size registration
   */
  compute(root: T): GraphResult<T> {
    ensure(
      this.isReady(root),
      `Cannot compute layout: missing sizes for some nodes. Have ${this.sizes.size} sizes.`
    );

    const placed = this.placeNodes(root, 0, { x: 0, y: 0 });
    const edges = this.generateEdges(placed);

    return { nodes: placed, edges };
  }

  /**
   * Traverse hierarchy depth-first and return flat array
   */
  traverse(root: T): T[] {
    const result: T[] = [root];
    if (root.children) {
      for (const child of root.children) {
        result.push(...this.traverse(child as T));
      }
    }
    return result;
  }

  private resolveDirection(node: T): "vertical" | "horizontal" {
    return node.direction ?? this.settings.direction;
  }

  /**
   * Recursively place nodes respecting per-node direction settings.
   */
  private placeNodes(node: T, depth: number, anchor: Coordinate): PlacedNode<T>[] {
    const placed: PlacedNode<T>[] = [];
    const nodeSize = this.sizes.get(node.id);
    ensure(nodeSize, `Missing size for node ${node.id}`);

    // Position this node
    const pos = depth === 0 ? { x: 0, y: 0 } : anchor;
    placed.push({ data: node, position: pos, depth });

    // Place children if present
    if (node.children && node.children.length > 0) {
      const flowDir = this.resolveDirection(node);

      if (flowDir === "vertical") {
        // Stack children vertically below parent
        const heights = node.children.map((c) => this.measureHeight(c as T));

        node.children.forEach((child, idx) => {
          const childSize = this.sizes.get(child.id);
          ensure(childSize, `Missing size for child ${child.id}`);

          const cx = pos.x - nodeSize.width / 2;
          const cy = this.computeStackY(
            pos.y + nodeSize.height / 2 + this.settings.gap.y,
            idx,
            heights
          );

          const childPlaced = this.placeNodes(child as T, depth + 1, {
            x: cx + childSize.width / 2 + this.settings.tuning.indent,
            y: cy + this.settings.tuning.verticalShift,
          });

          placed.push(...childPlaced);
        });
      } else {
        // Spread children horizontally beside parent
        const widths = node.children.map((c) => this.measureWidth(c as T));

        node.children.forEach((child, idx) => {
          const cx = this.computeSpreadX(pos.x, idx, widths);
          const cy = pos.y + nodeSize.height / 2 + this.settings.gap.y;

          const childSize = this.sizes.get(child.id);
          ensure(childSize, `Missing size for child ${child.id}`);

          const childPlaced = this.placeNodes(child as T, depth + 1, {
            x: cx,
            y: cy + childSize.height / 2,
          });

          placed.push(...childPlaced);
        });
      }
    }

    return placed;
  }

  /**
   * Measure the width needed for a subtree.
   */
  private measureWidth(node: T): number {
    const size = this.sizes.get(node.id);
    ensure(size, `Missing size for node ${node.id}`);

    if (!node.children || node.children.length === 0) {
      return size.width;
    }

    const dir = this.resolveDirection(node);

    if (dir === "horizontal") {
      const childWidths = node.children.map((c) => this.measureWidth(c as T));
      const totalChild = childWidths.reduce((sum, w) => sum + w, 0);
      const gaps = (node.children.length - 1) * this.settings.gap.x;
      return Math.max(size.width, totalChild + gaps);
    }

    // Vertical: width is node + compressed child width
    const childWidths = node.children.map((c) => this.measureWidth(c as T));
    const maxChild = Math.max(...childWidths);
    return size.width + this.settings.gap.x + maxChild * this.settings.tuning.compression;
  }

  /**
   * Measure the height needed for a subtree.
   */
  private measureHeight(node: T): number {
    const size = this.sizes.get(node.id);
    ensure(size, `Missing size for node ${node.id}`);

    if (!node.children || node.children.length === 0) {
      return size.height;
    }

    const dir = this.resolveDirection(node);

    if (dir === "vertical") {
      const childHeights = node.children.map((c) => this.measureHeight(c as T));
      const totalChild = childHeights.reduce((sum, h) => sum + h, 0);
      const gaps = (node.children.length - 1) * this.settings.gap.y;
      return Math.max(size.height, totalChild + gaps);
    }

    // Horizontal: height is node + tallest child
    const maxChild = Math.max(...node.children.map((c) => this.measureHeight(c as T)));
    return size.height + this.settings.gap.y + maxChild;
  }

  /**
   * Compute X position for horizontally spread children.
   */
  private computeSpreadX(parentX: number, idx: number, widths: number[]): number {
    const count = widths.length;

    if (count === 1) {
      return parentX;
    }

    const totalWidth = widths.reduce((sum, w) => sum + w, 0);
    const totalGaps = (count - 1) * this.settings.gap.x;
    const fullWidth = totalWidth + totalGaps;

    let x = parentX - fullWidth / 2;
    for (let i = 0; i < idx; i++) {
      x += widths[i] + this.settings.gap.x;
    }
    x += widths[idx] / 2;

    return x;
  }

  /**
   * Compute Y position for vertically stacked children.
   */
  private computeStackY(startY: number, idx: number, heights: number[]): number {
    let y = startY;

    y += heights[0] / 2;

    for (let i = 0; i < idx; i++) {
      y +=
        heights[i] / 2 +
        this.settings.gap.y * this.settings.tuning.siblingFactor +
        heights[i + 1] / 2;
    }

    return y;
  }

  /**
   * Generate edge paths between placed nodes.
   */
  private generateEdges(placed: PlacedNode<T>[]): Edge<T>[] {
    const edges: Edge<T>[] = [];
    const positionMap = new Map(placed.map((p) => [p.data.id, p]));

    for (const p of placed) {
      if (!p.data.children) continue;

      const parentSize = this.sizes.get(p.data.id);
      ensure(parentSize, `Parent size missing for ${p.data.id}`);

      const bounds = getBounds(p.position, parentSize);
      const dir = this.resolveDirection(p.data);

      for (const child of p.data.children) {
        const childPlaced = positionMap.get(child.id);
        ensure(childPlaced, `Cannot find placed node for ${child.id}`);

        const childSize = this.sizes.get(child.id);
        ensure(childSize, `Child size missing for ${child.id}`);

        const childBounds = getBounds(childPlaced.position, childSize);
        const waypoints = this.computeEdgePath(p.position, bounds, childPlaced.position, childBounds, dir);

        edges.push({
          source: p.data,
          target: childPlaced.data as T,
          waypoints,
        });
      }
    }

    return edges;
  }

  /**
   * Compute edge path between source and target.
   *
   * Vertical: Creates a spine-and-branch pattern
   * Horizontal: Creates a stepped Z-pattern
   */
  private computeEdgePath(
    srcPos: Coordinate,
    srcBounds: ReturnType<typeof getBounds>,
    tgtPos: Coordinate,
    tgtBounds: ReturnType<typeof getBounds>,
    dir: "vertical" | "horizontal"
  ): Coordinate[] {
    if (dir === "vertical") {
      const spineX =
        srcBounds.left -
        this.settings.edges.vertical.spineOffset +
        this.settings.edges.vertical.spineGap;

      return [
        { x: spineX, y: srcPos.y },
        { x: spineX, y: tgtPos.y },
        { x: tgtBounds.left, y: tgtPos.y },
      ];
    }

    const gap = tgtBounds.top - srcBounds.bottom;
    const midY = srcBounds.bottom + gap * 0.5;

    return [
      { x: srcPos.x, y: srcBounds.bottom },
      { x: srcPos.x, y: midY },
      { x: tgtPos.x, y: midY },
      { x: tgtPos.x, y: tgtBounds.top },
    ];
  }
}

function getBounds(pos: Coordinate, size: Dimensions) {
  return {
    left: pos.x - size.width / 2,
    right: pos.x + size.width / 2,
    top: pos.y - size.height / 2,
    bottom: pos.y + size.height / 2,
  };
}

/**
 * Assert that a condition is truthy, throw otherwise.
 */
export function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
