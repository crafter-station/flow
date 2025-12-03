import type { Coordinate } from "../types";

/**
 * SVG Path Commands:
 * - M (MoveTo): Move pen to a point without drawing
 * - L (LineTo): Draw a straight line to target
 * - Q (Quadratic): Draw a curved line with one control point
 */

export type MoveCommand = { cmd: "M"; to: Coordinate };
export type LineCommand = { cmd: "L"; to: Coordinate };
export type CurveCommand = { cmd: "Q"; control: Coordinate; to: Coordinate };

export type DrawCommand = MoveCommand | LineCommand | CurveCommand;

/**
 * Create a move command (M)
 */
export const moveTo = (point: Coordinate): MoveCommand => ({ cmd: "M", to: point });

/**
 * Create a line command (L)
 */
export const lineTo = (point: Coordinate): LineCommand => ({ cmd: "L", to: point });

/**
 * Create a quadratic curve command (Q)
 */
export const curveTo = (control: Coordinate, end: Coordinate): CurveCommand => ({
  cmd: "Q",
  control,
  to: end,
});

/**
 * Compile an array of draw commands into an SVG path string.
 *
 * @param commands - Array of drawing commands
 * @returns SVG path data string
 * @throws {Error} If commands array is empty or doesn't start with MoveTo
 *
 * @example
 * ```typescript
 * const d = compilePath([
 *   moveTo({ x: 0, y: 0 }),
 *   lineTo({ x: 100, y: 100 }),
 *   curveTo({ x: 150, y: 100 }, { x: 200, y: 150 })
 * ]);
 * // => "M 0 0 L 100 100 Q 150 100 200 150"
 * ```
 */
export function compilePath(commands: DrawCommand[]): string {
  if (commands.length === 0) {
    throw new Error("Cannot compile empty path - at least one command required");
  }

  if (commands[0].cmd !== "M") {
    throw new Error("Path must begin with MoveTo (M) command");
  }

  return commands
    .map((c) => {
      switch (c.cmd) {
        case "M":
          return `M ${c.to.x} ${c.to.y}`;
        case "L":
          return `L ${c.to.x} ${c.to.y}`;
        case "Q":
          return `Q ${c.control.x} ${c.control.y} ${c.to.x} ${c.to.y}`;
        default: {
          const _exhaustive: never = c;
          throw new Error(`Unknown command: ${JSON.stringify(_exhaustive)}`);
        }
      }
    })
    .join(" ");
}
