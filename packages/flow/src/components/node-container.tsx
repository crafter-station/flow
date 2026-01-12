import type { PropsWithChildren } from "react";
import type { Coordinate } from "../types";

export type NodeContainerProps = PropsWithChildren<{
  /** Unique identifier for click handling */
  id: string;
  /** Center position for the node */
  position: Coordinate;
}>;

/**
 * SVG foreignObject wrapper for positioning React components.
 * Centers the content on the given coordinate using CSS transform.
 *
 * Uses foreignObject to embed HTML within SVG, allowing any React
 * component to be rendered at precise canvas coordinates.
 *
 * Note: Using large explicit dimensions (4000x4000) instead of width=1/height=1
 * with overflow:visible to fix mobile Safari/Chrome rendering issues where
 * foreignObject content was invisible.
 */
export function NodeContainer({ id, position, children }: NodeContainerProps) {
  const size = 4000;
  const offset = size / 2;

  return (
    <foreignObject
      x={position.x - offset}
      y={position.y - offset}
      width={size}
      height={size}
      style={{ overflow: "visible", pointerEvents: "none" }}
    >
      <div
        data-node-id={id}
        style={{
          position: "absolute",
          left: offset,
          top: offset,
          transform: "translate(-50%, -50%)",
          pointerEvents: "auto",
        }}
      >
        {children}
      </div>
    </foreignObject>
  );
}
