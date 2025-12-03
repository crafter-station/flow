const BREATH_DURATION = 4;
const SCALE_FACTOR = 1.1;
const OPACITY_MIN = 0.5;
const OPACITY_MAX = 0.8;
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
 * Animated dot grid pattern for canvas backgrounds.
 * Dots subtly pulse with a breathing animation effect.
 *
 * @example
 * ```tsx
 * <svg>
 *   <DotGrid
 *     spacing={20}
 *     radius={1}
 *     color="rgba(100, 100, 100, 0.2)"
 *   />
 * </svg>
 * ```
 */
export function DotGrid({
  spacing,
  radius,
  color = "rgba(136, 136, 136, 0.3)",
  className,
  id = "flow-dots",
}: DotGridProps) {
  // Deterministic delays from ID to avoid hydration mismatch
  const delay1 = (id.length % 20) / 10;
  const delay2 = ((id.length + 7) % 20) / 10;

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
          >
            <animate
              attributeName="r"
              values={`${radius};${radius * SCALE_FACTOR};${radius}`}
              dur={`${BREATH_DURATION}s`}
              begin={`${delay1}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values={`${OPACITY_MIN};${OPACITY_MAX};${OPACITY_MIN}`}
              dur={`${BREATH_DURATION}s`}
              begin={`${delay2}s`}
              repeatCount="indefinite"
            />
          </circle>
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
