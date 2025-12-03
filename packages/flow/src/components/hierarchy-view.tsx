import { useCallback, useMemo, useRef } from "react";
import { HierarchyGraph } from "../core/hierarchy-graph";
import type { Coordinate, GraphConfig, HierarchyNode, SizeFn } from "../types";
import { type EdgeConfig, EdgePath } from "./edge-path";
import { NodeContainer } from "./node-container";

export type HierarchyViewProps<T extends HierarchyNode> = {
  /** Root node of the hierarchy */
  data: T;
  /**
   * Function to measure each node's size.
   * Called for every node during layout calculation.
   *
   * @example
   * ```tsx
   * const nodeSize = (node: MyNode) => {
   *   if (node.type === "root") return { width: 100, height: 50 };
   *   return { width: 200, height: 80 };
   * };
   * ```
   */
  nodeSize: SizeFn<T>;
  /** Gap between nodes (default: { x: 50, y: 50 }) */
  gap?: { x: number; y: number };
  /** Advanced layout settings */
  config?: Omit<GraphConfig, "gap" | "direction"> & {
    direction?: "vertical" | "horizontal";
  };
  /** Edge animation config */
  edgeAnimation?: EdgeConfig;
  /** Edge color (CSS value) */
  edgeColor?: string;
  /** Called when a node is clicked */
  onNodeClick?: (node: T) => void;
  /**
   * Render function for each node.
   *
   * @example
   * ```tsx
   * renderNode={(node, parent) => (
   *   <div className="p-4 bg-white rounded shadow">
   *     {node.label}
   *   </div>
   * )}
   * ```
   */
  renderNode: (node: T, parent?: T) => React.ReactNode;
  /**
   * Optional custom edge renderer.
   * If not provided, uses EdgePath with configured animation.
   */
  renderEdge?: (waypoints: Coordinate[], source: T, target: T) => React.ReactNode;
};

/**
 * Hierarchy visualization with automatic layout.
 * Computes positions for all nodes and renders them with connecting edges.
 *
 * @example
 * ```tsx
 * type MyNode = HierarchyNode & { label: string; kind: "root" | "child" };
 *
 * const data: MyNode = {
 *   id: "1",
 *   label: "Root",
 *   kind: "root",
 *   children: [
 *     { id: "2", label: "Child 1", kind: "child" },
 *     { id: "3", label: "Child 2", kind: "child" },
 *   ],
 * };
 *
 * <HierarchyView<MyNode>
 *   data={data}
 *   nodeSize={(node) => ({ width: 200, height: 80 })}
 *   renderNode={(node) => <Card>{node.label}</Card>}
 *   onNodeClick={(node) => console.log("Clicked:", node.id)}
 * />
 * ```
 */
export function HierarchyView<T extends HierarchyNode>({
  data,
  nodeSize,
  gap = { x: 50, y: 50 },
  config,
  edgeAnimation,
  edgeColor,
  renderNode,
  renderEdge,
  onNodeClick,
}: HierarchyViewProps<T>) {
  const containerRef = useRef<SVGGElement>(null);

  const graph = useMemo(
    () =>
      new HierarchyGraph<T>({
        gap,
        direction: config?.direction ?? "vertical",
        tuning: config?.tuning,
        edges: config?.edges,
      }),
    [gap, config]
  );

  const parentLookup = useMemo(() => {
    const lookup = new Map<string, T>();
    const walk = (node: T) => {
      if (node.children) {
        for (const child of node.children) {
          lookup.set(child.id, node);
          walk(child as T);
        }
      }
    };
    walk(data);
    return lookup;
  }, [data]);

  const allNodes = useMemo(() => graph.traverse(data), [data, graph]);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGGElement>) => {
      if (!onNodeClick) return;

      let target = e.target as HTMLElement | SVGElement;
      while (target && target !== e.currentTarget) {
        const nodeId = target.getAttribute("data-node-id");
        if (nodeId) {
          const node = allNodes.find((n) => n.id === nodeId);
          if (node) onNodeClick(node);
          break;
        }
        target = target.parentElement as HTMLElement | SVGElement;
      }
    },
    [onNodeClick, allNodes]
  );

  // Register sizes for all nodes
  for (const node of allNodes) {
    const size = nodeSize(node);
    graph.registerSize(node.id, size);
  }

  const layout = useMemo(() => graph.compute(data), [data, graph]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Click bubbling for node selection
    <g ref={containerRef} onClick={handleClick}>
      {layout.edges.map((edge) =>
        renderEdge ? (
          renderEdge(edge.waypoints, edge.source, edge.target)
        ) : (
          <EdgePath
            key={`${edge.source.id}-${edge.target.id}`}
            waypoints={edge.waypoints}
            animation={edgeAnimation}
            color={edgeColor}
          />
        )
      )}
      {layout.nodes.map((placed) => {
        const parent = parentLookup.get(placed.data.id);
        return (
          <NodeContainer
            key={placed.data.id}
            id={placed.data.id}
            position={placed.position}
          >
            {renderNode(placed.data, parent)}
          </NodeContainer>
        );
      })}
    </g>
  );
}
