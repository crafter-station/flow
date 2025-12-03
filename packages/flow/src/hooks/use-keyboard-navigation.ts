import { useCallback, useMemo } from "react";
import type { Coordinate, HierarchyNode, PlacedNode } from "../types";

export type KeyboardNavigationOptions<T extends HierarchyNode> = {
  /** All placed nodes from layout */
  nodes: PlacedNode<T>[];
  /** Currently selected node ID */
  selectedId: string | null;
  /** Callback when selection changes */
  onSelect: (node: T) => void;
  /** Whether navigation is enabled */
  enabled?: boolean;
  /** Callback when Enter is pressed on selected node */
  onActivate?: (node: T) => void;
  /** Custom key bindings (key codes) */
  keyMap?: {
    up?: string;
    down?: string;
    left?: string;
    right?: string;
    select?: string;
  };
};

type Direction = "up" | "down" | "left" | "right";

const DEFAULT_KEYS = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  select: "Enter",
};

/**
 * Find the nearest node in a given direction from the current position.
 */
function findNearestNode<T extends HierarchyNode>(
  from: PlacedNode<T>,
  candidates: PlacedNode<T>[],
  direction: Direction
): PlacedNode<T> | null {
  // Filter nodes in the target direction
  const filtered = candidates.filter((n) => {
    if (n.data.id === from.data.id) return false;

    switch (direction) {
      case "up":
        return n.position.y < from.position.y;
      case "down":
        return n.position.y > from.position.y;
      case "left":
        return n.position.x < from.position.x;
      case "right":
        return n.position.x > from.position.x;
    }
  });

  if (filtered.length === 0) return null;

  // Sort by distance, prioritizing the primary direction
  const isVertical = direction === "up" || direction === "down";

  return filtered.sort((a, b) => {
    // Primary axis distance
    const primaryA = isVertical
      ? Math.abs(a.position.y - from.position.y)
      : Math.abs(a.position.x - from.position.x);
    const primaryB = isVertical
      ? Math.abs(b.position.y - from.position.y)
      : Math.abs(b.position.x - from.position.x);

    // Secondary axis distance (for tie-breaking)
    const secondaryA = isVertical
      ? Math.abs(a.position.x - from.position.x)
      : Math.abs(a.position.y - from.position.y);
    const secondaryB = isVertical
      ? Math.abs(b.position.x - from.position.x)
      : Math.abs(b.position.y - from.position.y);

    // Combined distance with primary axis weighted more heavily
    const distanceA = primaryA * 2 + secondaryA;
    const distanceB = primaryB * 2 + secondaryB;

    return distanceA - distanceB;
  })[0];
}

/**
 * Hook for keyboard navigation between nodes.
 * Returns props to spread on the container element.
 *
 * @example
 * ```tsx
 * const { containerProps } = useKeyboardNavigation({
 *   nodes: layout.nodes,
 *   selectedId,
 *   onSelect: setSelectedId,
 *   onActivate: handleNodeActivate,
 * });
 *
 * return (
 *   <div {...containerProps}>
 *     <ZoomableCanvas>...</ZoomableCanvas>
 *   </div>
 * );
 * ```
 */
export function useKeyboardNavigation<T extends HierarchyNode>({
  nodes,
  selectedId,
  onSelect,
  enabled = true,
  onActivate,
  keyMap,
}: KeyboardNavigationOptions<T>): {
  /** Props to spread on the container element */
  containerProps: {
    tabIndex: number;
    onKeyDown: (e: React.KeyboardEvent) => void;
    role: string;
    "aria-label": string;
  };
} {
  const keys = useMemo(
    () => ({
      ...DEFAULT_KEYS,
      ...keyMap,
    }),
    [keyMap]
  );

  // Build lookup for quick access
  const nodeLookup = useMemo(() => {
    const lookup = new Map<string, PlacedNode<T>>();
    for (const node of nodes) {
      lookup.set(node.data.id, node);
    }
    return lookup;
  }, [nodes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled || nodes.length === 0) return;

      // Handle activation (Enter)
      if (e.key === keys.select && selectedId) {
        const selected = nodeLookup.get(selectedId);
        if (selected) {
          e.preventDefault();
          onActivate?.(selected.data);
        }
        return;
      }

      // Map key to direction
      let direction: Direction | null = null;
      if (e.key === keys.up) direction = "up";
      else if (e.key === keys.down) direction = "down";
      else if (e.key === keys.left) direction = "left";
      else if (e.key === keys.right) direction = "right";

      if (!direction) return;

      e.preventDefault();

      // If no selection, select the first node
      if (!selectedId) {
        const firstNode = nodes[0];
        if (firstNode) {
          onSelect(firstNode.data);
        }
        return;
      }

      // Find current node
      const current = nodeLookup.get(selectedId);
      if (!current) return;

      // Find nearest node in direction
      const nearest = findNearestNode(current, nodes, direction);
      if (nearest) {
        onSelect(nearest.data);
      }
    },
    [enabled, nodes, selectedId, keys, nodeLookup, onSelect, onActivate]
  );

  return {
    containerProps: {
      tabIndex: enabled ? 0 : -1,
      onKeyDown: handleKeyDown,
      role: "application",
      "aria-label": "Hierarchy navigation. Use arrow keys to navigate between nodes.",
    },
  };
}
