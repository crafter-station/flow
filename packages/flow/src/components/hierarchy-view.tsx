import { useCallback, useMemo, useState } from "react";
import { HierarchyGraph } from "../core/hierarchy-graph";
import type {
  Coordinate,
  DragMode,
  GraphConfig,
  HierarchyNode,
  NodeDragEvent,
  PositionOverrides,
  SizeFn,
} from "../types";
import { DraggableNodeContainer } from "./draggable-node-container";
import { type EdgeConfig, EdgePath } from "./edge-path";
import { NodeContainer } from "./node-container";

export type HierarchyViewProps<T extends HierarchyNode> = {
  data: T;
  nodeSize: SizeFn<T>;
  gap?: { x: number; y: number };
  config?: Omit<GraphConfig, "gap" | "direction"> & {
    direction?: "vertical" | "horizontal";
  };
  edgeAnimation?: EdgeConfig;
  edgeColor?: string;
  onNodeClick?: (node: T) => void;
  renderNode: (node: T, parent?: T) => React.ReactNode;
  renderEdge?: (waypoints: Coordinate[], source: T, target: T) => React.ReactNode;
  dragMode?: DragMode;
  positionOverrides?: PositionOverrides;
  onNodeDragEnd?: (event: NodeDragEvent<T>) => void;
  zoom?: number;
  selectedNodeId?: string;
};

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
  dragMode = false,
  positionOverrides,
  onNodeDragEnd,
  zoom = 1,
  selectedNodeId,
}: HierarchyViewProps<T>) {
  const [internalOverrides, setInternalOverrides] = useState<PositionOverrides>(() => new Map());
  const [liveDrag, setLiveDrag] = useState<{ nodeId: string; delta: Coordinate } | null>(null);

  const effectiveOverrides = positionOverrides ?? internalOverrides;

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

  const nodeLookup = useMemo(() => {
    const lookup = new Map<string, T>();
    for (const node of allNodes) {
      lookup.set(node.id, node);
    }
    return lookup;
  }, [allNodes]);

  const getSubtreeIds = useCallback((node: T): string[] => {
    const ids: string[] = [node.id];
    if (node.children) {
      for (const child of node.children) {
        ids.push(...getSubtreeIds(child as T));
      }
    }
    return ids;
  }, []);

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

  for (const node of allNodes) {
    const size = nodeSize(node);
    graph.registerSize(node.id, size);
  }

  const layout = useMemo(() => graph.compute(data), [data, graph]);

  const positionLookup = useMemo(() => {
    const lookup = new Map<string, Coordinate>();
    for (const placed of layout.nodes) {
      const override = effectiveOverrides.get(placed.data.id);
      lookup.set(placed.data.id, override ?? placed.position);
    }
    return lookup;
  }, [layout.nodes, effectiveOverrides]);

  const handleDragStart = useCallback((nodeId: string) => {
    setLiveDrag({ nodeId, delta: { x: 0, y: 0 } });
  }, []);

  const handleDrag = useCallback((nodeId: string, delta: Coordinate) => {
    setLiveDrag({ nodeId, delta });
  }, []);

  const handleDragEnd = useCallback(
    (nodeId: string, finalDelta: Coordinate) => {
      setLiveDrag(null);

      const node = nodeLookup.get(nodeId);
      if (!node) return;

      const affectedIds = dragMode === "subtree" ? getSubtreeIds(node) : [nodeId];
      const affectedNodes = affectedIds
        .map((id) => nodeLookup.get(id))
        .filter((n): n is T => n !== undefined);

      const basePosition = positionLookup.get(nodeId);
      if (!basePosition) return;

      const newPosition: Coordinate = {
        x: basePosition.x + finalDelta.x,
        y: basePosition.y + finalDelta.y,
      };

      if (!positionOverrides) {
        setInternalOverrides((prev) => {
          const next = new Map(prev);
          for (const id of affectedIds) {
            const pos = positionLookup.get(id);
            if (pos) {
              next.set(id, {
                x: pos.x + finalDelta.x,
                y: pos.y + finalDelta.y,
              });
            }
          }
          return next;
        });
      }

      onNodeDragEnd?.({ node, affectedNodes, delta: finalDelta, newPosition });
    },
    [dragMode, nodeLookup, getSubtreeIds, positionLookup, positionOverrides, onNodeDragEnd]
  );

  const handleDragCancel = useCallback(() => {
    setLiveDrag(null);
  }, []);

  const liveAffectedIds = useMemo(() => {
    if (!liveDrag) return new Set<string>();
    const node = nodeLookup.get(liveDrag.nodeId);
    if (!node) return new Set<string>();
    const ids = dragMode === "subtree" ? getSubtreeIds(node) : [liveDrag.nodeId];
    return new Set(ids);
  }, [liveDrag, nodeLookup, dragMode, getSubtreeIds]);

  const displayEdges = useMemo(() => {
    if (effectiveOverrides.size === 0 && !liveDrag) {
      return layout.edges;
    }

    return graph.regenerateEdges(
      layout.nodes.map((placed) => {
        const basePos = positionLookup.get(placed.data.id) ?? placed.position;

        if (liveDrag && liveAffectedIds.has(placed.data.id)) {
          return {
            ...placed,
            position: {
              x: basePos.x + liveDrag.delta.x,
              y: basePos.y + liveDrag.delta.y,
            },
          };
        }

        return { ...placed, position: basePos };
      })
    );
  }, [layout, effectiveOverrides, graph, positionLookup, liveDrag, liveAffectedIds]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Click bubbling for node selection
    <g onClick={handleClick}>
      <g className="edges">
        {displayEdges.map((edge) =>
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
      </g>

      <g className="nodes">
        {layout.nodes.map((placed) => {
          const parent = parentLookup.get(placed.data.id);
          let position = positionLookup.get(placed.data.id) ?? placed.position;
          const isSelected = selectedNodeId === placed.data.id;

          if (liveDrag && liveAffectedIds.has(placed.data.id) && placed.data.id !== liveDrag.nodeId) {
            position = {
              x: position.x + liveDrag.delta.x,
              y: position.y + liveDrag.delta.y,
            };
          }

          if (dragMode) {
            return (
              <DraggableNodeContainer
                key={placed.data.id}
                id={placed.data.id}
                position={position}
                draggable={true}
                zoom={zoom}
                selected={isSelected}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                {renderNode(placed.data, parent)}
              </DraggableNodeContainer>
            );
          }

          return (
            <NodeContainer key={placed.data.id} id={placed.data.id} position={position}>
              {renderNode(placed.data, parent)}
            </NodeContainer>
          );
        })}
      </g>
    </g>
  );
}
