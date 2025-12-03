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
 */
export function NodeContainer({ id, position, children }: NodeContainerProps) {
  return (
    <foreignObject x={position.x} y={position.y} width={1} height={1} overflow="visible">
      <div
        data-node-id={id}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "translate(-50%, -50%)",
        }}
      >
        {children}
      </div>
    </foreignObject>
  );
}
