import { useMemo, useRef } from "react";
import type { Coordinate } from "../types";
import {
  type CurveCommand,
  type DrawCommand,
  type LineCommand,
  compilePath,
  curveTo,
  lineTo,
  moveTo,
} from "../svg/path-builder";

const BEND_RADIUS = 32;

/**
 * Built-in animation styles for edge paths.
 */
export const EDGE_STYLES = {
  dots: {
    dash: 0.1,
    gap: 8,
    duration: 2,
    width: 3,
  },
  dashes: {
    dash: 8,
    gap: 8,
    duration: 1,
    width: 2.5,
  },
  "dots-slow": {
    dash: 0.1,
    gap: 12,
    duration: 8,
    width: 3,
  },
  "dashes-fast": {
    dash: 6,
    gap: 6,
    duration: 0.5,
    width: 2.5,
  },
  pulse: {
    dash: 4,
    gap: 16,
    duration: 3,
    width: 3.5,
  },
} as const;

export type EdgeStyle = keyof typeof EDGE_STYLES;

export type EdgeAnimation = {
  /** Length of dash/dot */
  dash: number;
  /** Gap between dashes */
  gap: number;
  /** Seconds per animation cycle */
  duration: number;
  /** Stroke width */
  width: number;
  /** Stroke color */
  color: string;
};

export type EdgeConfig =
  | { style: EdgeStyle; color?: string }
  | { custom: Partial<EdgeAnimation> };

export type EdgePathProps = {
  /** Waypoints defining the edge path */
  waypoints: Coordinate[];
  /** Animation configuration */
  animation?: EdgeConfig;
  /** Stroke color (overrides animation color) */
  color?: string;
  /** Additional className */
  className?: string;
};

const DEFAULT_COLOR = "#888888";

/**
 * Animated edge path with rounded corners at direction changes.
 *
 * @example
 * ```tsx
 * <EdgePath
 *   waypoints={[{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]}
 *   animation={{ style: "dots" }}
 *   color="#3b82f6"
 * />
 * ```
 */
export function EdgePath({
  waypoints,
  animation = { style: "dots" },
  color,
  className,
}: EdgePathProps) {
  const pathRef = useRef<SVGPathElement>(null);

  const config = useMemo((): EdgeAnimation => {
    if ("style" in animation) {
      const preset = EDGE_STYLES[animation.style];
      return {
        ...preset,
        color: color ?? animation.color ?? DEFAULT_COLOR,
      };
    }

    const base = EDGE_STYLES.dots;
    return {
      dash: animation.custom.dash ?? base.dash,
      gap: animation.custom.gap ?? base.gap,
      duration: animation.custom.duration ?? base.duration,
      width: animation.custom.width ?? base.width,
      color: color ?? animation.custom.color ?? DEFAULT_COLOR,
    };
  }, [animation, color]);

  const pathData = useMemo(() => buildEdgePath(waypoints), [waypoints]);

  const dashArray = `${config.dash} ${config.gap}`;
  const dashTotal = config.dash + config.gap;

  return (
    <path
      ref={pathRef}
      d={pathData}
      stroke={config.color}
      strokeWidth={config.width}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={dashArray}
      className={className}
    >
      <animate
        attributeName="stroke-dashoffset"
        to={`-${dashTotal}`}
        from="0"
        dur={`${config.duration}s`}
        repeatCount="indefinite"
      />
    </path>
  );
}

/**
 * Build SVG path with rounded corners at direction changes.
 */
function buildEdgePath(points: Coordinate[]): string {
  if (points.length < 2) {
    return "";
  }
  if (points.length === 2) {
    return compilePath([moveTo(points[0]), lineTo(points[1])]);
  }

  const commands: DrawCommand[] = [moveTo(points[0])];

  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const after = points[i + 2];

    if (after === undefined) {
      commands.push(lineTo(next));
      continue;
    }

    if (isCorner(curr, next, after)) {
      commands.push(...roundCorner(curr, next, after));
    } else {
      commands.push(lineTo(next));
    }
  }

  return compilePath(commands);
}

/**
 * Detect if three consecutive points form a corner (direction change).
 */
function isCorner(a: Coordinate, b: Coordinate, c: Coordinate): boolean {
  const dx1 = b.x - a.x;
  const dy1 = b.y - a.y;
  const dx2 = c.x - b.x;
  const dy2 = c.y - b.y;

  return (
    (dx1 !== 0 && dy1 === 0 && dx2 === 0 && dy2 !== 0) ||
    (dx1 === 0 && dy1 !== 0 && dx2 !== 0 && dy2 === 0)
  );
}

/**
 * Generate commands for a rounded corner at the middle point.
 */
function roundCorner(
  prev: Coordinate,
  corner: Coordinate,
  next: Coordinate
): [LineCommand, CurveCommand] {
  const dx1 = corner.x - prev.x;
  const dy1 = corner.y - prev.y;
  const dx2 = next.x - corner.x;
  const dy2 = next.y - corner.y;

  // Entry point before corner
  const dist1 = Math.sqrt(dx1 ** 2 + dy1 ** 2);
  const r1 = Math.min(BEND_RADIUS, dist1 / 2);
  const t1 = (dist1 - r1) / dist1;

  const entry = {
    x: prev.x + dx1 * t1,
    y: prev.y + dy1 * t1,
  };

  // Exit point after corner
  const dist2 = Math.sqrt(dx2 ** 2 + dy2 ** 2);
  const r2 = Math.min(BEND_RADIUS, dist2 / 2);
  const t2 = r2 / dist2;

  const exit = {
    x: corner.x + dx2 * t2,
    y: corner.y + dy2 * t2,
  };

  return [lineTo(entry), curveTo(corner, exit)];
}
