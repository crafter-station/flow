const COVERAGE_OFFSET = -5000;
const COVERAGE_SIZE = 10000;

export type DotGridProps = {
  /** Space between dots (default: 15) */
  spacing: number;
  /** Radius of each dot (default: 1.5) */
  radius: number;
  /** CSS color for dots */
  color?: string;
  /** Additional className for styling */
  className?: string;
  /** Unique ID for the pattern (default: "flow-dots") */
  id?: string;
};

/**
 * Dot grid pattern for canvas backgrounds.
 *
 * @example
 * ```tsx
 * <svg>
 *   <DotGrid
 *     spacing={20}
 *     radius={1}
 *     color="rgba(100, 100, 100, 0.1)"
 *   />
 * </svg>
 * ```
 */
export function DotGrid({
  spacing,
  radius,
  color = "rgba(136, 136, 136, 0.15)",
  className,
  id = "flow-dots",
}: DotGridProps) {
  return (
    <>
      <defs>
        <pattern
          id={id}
          x={0}
          y={0}
          width={spacing}
          height={spacing}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={spacing / 2}
            cy={spacing / 2}
            r={radius}
            fill={color}
            className={className}
          />
        </pattern>
      </defs>
      <rect
        x={COVERAGE_OFFSET}
        y={COVERAGE_OFFSET}
        width={COVERAGE_SIZE}
        height={COVERAGE_SIZE}
        fill={`url(#${id})`}
      />
    </>
  );
}
