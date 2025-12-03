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

  traverse(root: T): T[] {
    const result: T[] = [root];
    if (root.children) {
      for (const child of root.children) {
        result.push(...this.traverse(child as T));
      }
    }
    return result;
  }

  regenerateEdges(placedWithOverrides: PlacedNode<T>[]): Edge<T>[] {
    return this.generateEdges(placedWithOverrides);
  }

  getSubtreeIds(node: T): string[] {
    const ids: string[] = [node.id];
    if (node.children) {
      for (const child of node.children) {
        ids.push(...this.getSubtreeIds(child as T));
      }
    }
    return ids;
  }

  private resolveDirection(node: T): "vertical" | "horizontal" {
    return node.direction ?? this.settings.direction;
  }

  private placeNodes(node: T, depth: number, anchor: Coordinate): PlacedNode<T>[] {
    const placed: PlacedNode<T>[] = [];
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
          });
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
          });
          placed.push(...childPlaced);
        });
      }
    }

    return placed;
  }

  private measureWidth(node: T): number {
    const size = this.sizes.get(node.id);
    ensure(size, `Missing size for node ${node.id}`);

    if (!node.children || node.children.length === 0) return size.width;

    const dir = this.resolveDirection(node);

    if (dir === "horizontal") {
      const childWidths = node.children.map((c) => this.measureWidth(c as T));
      const totalChild = childWidths.reduce((sum, w) => sum + w, 0);
      const gaps = (node.children.length - 1) * this.settings.gap.x;
      return Math.max(size.width, totalChild + gaps);
    }

    const childWidths = node.children.map((c) => this.measureWidth(c as T));
    const maxChild = Math.max(...childWidths);
    return size.width + this.settings.gap.x + maxChild * this.settings.tuning.compression;
  }

  private measureHeight(node: T): number {
    const size = this.sizes.get(node.id);
    ensure(size, `Missing size for node ${node.id}`);

    if (!node.children || node.children.length === 0) return size.height;

    const dir = this.resolveDirection(node);

    if (dir === "vertical") {
      const childHeights = node.children.map((c) => this.measureHeight(c as T));
      const totalChild = childHeights.reduce((sum, h) => sum + h, 0);
      const gaps = (node.children.length - 1) * this.settings.gap.y;
      return Math.max(size.height, totalChild + gaps);
    }

    const maxChild = Math.max(...node.children.map((c) => this.measureHeight(c as T)));
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

        edges.push({ source: p.data, target: childPlaced.data as T, waypoints });
      }
    }

    return edges;
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
