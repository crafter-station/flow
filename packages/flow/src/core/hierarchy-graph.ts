import type {
  Coordinate,
  Dimensions,
  Edge,
  GraphConfig,
  GraphResult,
  HierarchyNode,
  PlacedNode,
} from "../types";

export class HierarchyGraph<T extends HierarchyNode> {
  private settings: Required<GraphConfig> & {
    tuning: Required<Required<GraphConfig>["tuning"]>;
    edges: Required<Required<GraphConfig>["edges"]> & {
      vertical: Required<Required<Required<GraphConfig>["edges"]>["vertical"]>;
    };
  };
  private sizes: Map<string, Dimensions>;

  constructor(config: GraphConfig) {
    ensure(
      config && typeof config === "object",
      "HierarchyGraph requires a config object, e.g. new HierarchyGraph({ gap: { x: 50, y: 50 } })"
    );
    ensure(
      config.gap && typeof config.gap.x === "number" && typeof config.gap.y === "number",
      "HierarchyGraph config requires gap: { x: number, y: number }"
    );
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
      links: config.links ?? [],
    };
    this.sizes = new Map();
  }

  registerSize(id: string, size: Dimensions): void {
    this.sizes.set(id, size);
  }

  isReady(root: T): boolean {
    return this.traverse(root).every((n) => this.sizes.has(n.id));
  }

  compute(root: T): GraphResult<T> {
    ensure(this.isReady(root), `Missing sizes for some nodes. Have ${this.sizes.size} sizes.`);
    const placed = this.placeNodes(root, 0, { x: 0, y: 0 });
    const edges = this.generateEdges(placed);
    return { nodes: placed, edges };
  }

  /**
   * Depth-first list of every node reachable from `root`.
   *
   * The layout is a tree: each node is visited once. A node reached twice
   * (shared child, or a cycle) is skipped the second time, so a malformed
   * graph degrades to its spanning tree instead of duplicating nodes or
   * overflowing the stack.
   */
  traverse(root: T): T[] {
    const result: T[] = [];
    const seen = new Set<string>();

    const walk = (node: T): void => {
      if (seen.has(node.id)) return;
      seen.add(node.id);
      result.push(node);
      if (node.children) {
        for (const child of node.children) walk(child as T);
      }
    };

    walk(root);
    return result;
  }

  regenerateEdges(placedWithOverrides: PlacedNode<T>[]): Edge<T>[] {
    return this.generateEdges(placedWithOverrides);
  }

  getSubtreeIds(node: T): string[] {
    return this.traverse(node).map((n) => n.id);
  }

  private resolveDirection(node: T): "vertical" | "horizontal" {
    return node.direction ?? this.settings.direction;
  }

  private placeNodes(
    node: T,
    depth: number,
    anchor: Coordinate,
    seen: Set<string> = new Set()
  ): PlacedNode<T>[] {
    const placed: PlacedNode<T>[] = [];
    if (seen.has(node.id)) return placed;
    seen.add(node.id);

    const nodeSize = this.sizes.get(node.id);
    ensure(nodeSize, `Missing size for node ${node.id}`);

    const pos = depth === 0 ? { x: 0, y: 0 } : anchor;
    placed.push({ data: node, position: pos, depth });

    if (node.children && node.children.length > 0) {
      const flowDir = this.resolveDirection(node);

      if (flowDir === "vertical") {
        const heights = node.children.map((c) => this.measureHeight(c as T));

        node.children.forEach((child, idx) => {
          const childSize = this.sizes.get(child.id);
          ensure(childSize, `Missing size for child ${child.id}`);

          const cx = pos.x - nodeSize.width / 2;
          const cy = this.computeStackY(pos.y + nodeSize.height / 2 + this.settings.gap.y, idx, heights);

          const childPlaced = this.placeNodes(child as T, depth + 1, {
            x: cx + childSize.width / 2 + this.settings.tuning.indent,
            y: cy + this.settings.tuning.verticalShift,
          }, seen);
          placed.push(...childPlaced);
        });
      } else {
        const widths = node.children.map((c) => this.measureWidth(c as T));

        node.children.forEach((child, idx) => {
          const cx = this.computeSpreadX(pos.x, idx, widths);
          const cy = pos.y + nodeSize.height / 2 + this.settings.gap.y;
          const childSize = this.sizes.get(child.id);
          ensure(childSize, `Missing size for child ${child.id}`);

          const childPlaced = this.placeNodes(child as T, depth + 1, {
            x: cx,
            y: cy + childSize.height / 2,
          }, seen);
          placed.push(...childPlaced);
        });
      }
    }

    return placed;
  }

  private measureWidth(node: T, seen: Set<string> = new Set()): number {
    const size = this.sizes.get(node.id);
    ensure(size, `Missing size for node ${node.id}`);

    if (seen.has(node.id)) return size.width;
    seen.add(node.id);

    if (!node.children || node.children.length === 0) return size.width;

    const dir = this.resolveDirection(node);
    const childWidths = node.children.map((c) => this.measureWidth(c as T, seen));

    if (dir === "horizontal") {
      const totalChild = childWidths.reduce((sum, w) => sum + w, 0);
      const gaps = (node.children.length - 1) * this.settings.gap.x;
      return Math.max(size.width, totalChild + gaps);
    }

    const maxChild = Math.max(...childWidths);
    return size.width + this.settings.gap.x + maxChild * this.settings.tuning.compression;
  }

  private measureHeight(node: T, seen: Set<string> = new Set()): number {
    const size = this.sizes.get(node.id);
    ensure(size, `Missing size for node ${node.id}`);

    if (seen.has(node.id)) return size.height;
    seen.add(node.id);

    if (!node.children || node.children.length === 0) return size.height;

    const dir = this.resolveDirection(node);
    const childHeights = node.children.map((c) => this.measureHeight(c as T, seen));

    if (dir === "vertical") {
      const totalChild = childHeights.reduce((sum, h) => sum + h, 0);
      const gaps = (node.children.length - 1) * this.settings.gap.y;
      return Math.max(size.height, totalChild + gaps);
    }

    const maxChild = Math.max(...childHeights);
    return size.height + this.settings.gap.y + maxChild;
  }

  private computeSpreadX(parentX: number, idx: number, widths: number[]): number {
    const count = widths.length;
    if (count === 1) return parentX;

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

  private computeStackY(startY: number, idx: number, heights: number[]): number {
    let y = startY + heights[0] / 2;

    for (let i = 0; i < idx; i++) {
      y += heights[i] / 2 + this.settings.gap.y * this.settings.tuning.siblingFactor + heights[i + 1] / 2;
    }

    return y;
  }

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

        edges.push({ source: p.data, target: childPlaced.data as T, waypoints, kind: "tree" });
      }
    }

    edges.push(...this.generateCrossEdges(positionMap));

    return edges;
  }

  /**
   * Edges for relations the tree could not express. Positions come from the
   * tree layout, so these only connect nodes that were already placed; a link
   * naming an unplaced node is skipped rather than throwing, because the
   * caller's graph legitimately holds more relations than one tree can show.
   */
  private generateCrossEdges(positionMap: Map<string, PlacedNode<T>>): Edge<T>[] {
    const edges: Edge<T>[] = [];

    for (const link of this.settings.links) {
      const source = positionMap.get(link.source);
      const target = positionMap.get(link.target);
      if (!source || !target) continue;

      const sourceSize = this.sizes.get(link.source);
      const targetSize = this.sizes.get(link.target);
      if (!sourceSize || !targetSize) continue;

      edges.push({
        source: source.data as T,
        target: target.data as T,
        waypoints: this.computeCrossPath(
          source.position,
          getBounds(source.position, sourceSize),
          target.position,
          getBounds(target.position, targetSize)
        ),
        kind: "cross",
      });
    }

    return edges;
  }

  /**
   * Path for a relation the tree does not own.
   *
   * Tree edges route orthogonally through the midpoint between two rows,
   * which is right for a parent reaching its child and wrong for a link
   * spanning the layout: every long edge lands on the same midline and the
   * set reads as one band instead of many relations.
   *
   * A cross edge instead leaves from the side of each node and bows away
   * from the row, by an amount that grows with the horizontal distance it
   * covers. Neighbours stay nearly flat, distant pairs arc high, and edges
   * sharing a row separate because they span different distances.
   */
  private computeCrossPath(
    srcPos: Coordinate,
    srcBounds: ReturnType<typeof getBounds>,
    tgtPos: Coordinate,
    tgtBounds: ReturnType<typeof getBounds>
  ): Coordinate[] {
    const goingRight = tgtPos.x >= srcPos.x;
    const start = {
      x: goingRight ? srcBounds.right : srcBounds.left,
      y: srcPos.y,
    };
    const end = {
      x: goingRight ? tgtBounds.left : tgtBounds.right,
      y: tgtPos.y,
    };

    const span = Math.abs(end.x - start.x);
    if (span < 1) return [start, end];

    // Bow above the row, deeper the further the edge travels, so that two
    // edges on the same row are only confusable if they span the same width.
    const lift = Math.min(span * 0.28, this.settings.gap.y * 6);
    const crest = Math.min(start.y, end.y) - lift;

    const first = { x: start.x + (end.x - start.x) * 0.25, y: crest };
    const second = { x: start.x + (end.x - start.x) * 0.75, y: crest };

    return [start, first, second, end];
  }

  private computeEdgePath(
    srcPos: Coordinate,
    srcBounds: ReturnType<typeof getBounds>,
    tgtPos: Coordinate,
    tgtBounds: ReturnType<typeof getBounds>,
    _dir: "vertical" | "horizontal"
  ): Coordinate[] {
    const dx = tgtPos.x - srcPos.x;
    const dy = tgtPos.y - srcPos.y;

    if (Math.abs(dy) > Math.abs(dx) * 0.5 && dy > 0) {
      const midY = srcBounds.bottom + (tgtBounds.top - srcBounds.bottom) / 2;
      return [
        { x: srcPos.x, y: srcBounds.bottom },
        { x: srcPos.x, y: midY },
        { x: tgtPos.x, y: midY },
        { x: tgtPos.x, y: tgtBounds.top },
      ];
    }

    if (Math.abs(dy) > Math.abs(dx) * 0.5 && dy < 0) {
      const midY = srcBounds.top + (tgtBounds.bottom - srcBounds.top) / 2;
      return [
        { x: srcPos.x, y: srcBounds.top },
        { x: srcPos.x, y: midY },
        { x: tgtPos.x, y: midY },
        { x: tgtPos.x, y: tgtBounds.bottom },
      ];
    }

    if (dx > 0) {
      const midX = srcBounds.right + (tgtBounds.left - srcBounds.right) / 2;
      return [
        { x: srcBounds.right, y: srcPos.y },
        { x: midX, y: srcPos.y },
        { x: midX, y: tgtPos.y },
        { x: tgtBounds.left, y: tgtPos.y },
      ];
    }

    const midX = srcBounds.left + (tgtBounds.right - srcBounds.left) / 2;
    return [
      { x: srcBounds.left, y: srcPos.y },
      { x: midX, y: srcPos.y },
      { x: midX, y: tgtPos.y },
      { x: tgtBounds.right, y: tgtPos.y },
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

export function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
