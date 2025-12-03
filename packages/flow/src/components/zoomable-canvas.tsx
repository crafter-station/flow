"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Coordinate } from "../types";
import { type ErrorBoundaryProps, ErrorBoundary } from "./error-boundary";
import { DotGrid } from "./dot-grid";

const ZOOM_MIN_DEFAULT = 0.5;
const ZOOM_MAX_DEFAULT = 3;
const ZOOM_INITIAL = 1;
const ZOOM_SENSITIVITY = 0.001;
const GRID_SPACING_DEFAULT = 15;
const DOT_SIZE_DEFAULT = 1.5;
const DOT_COLOR_DEFAULT = "rgba(136, 136, 136, 0.3)";
const MAIN_BUTTON = 0;
const DECAY = 0.92;
const VELOCITY_THRESHOLD = 0.5;

type ViewState = {
  zoom: number;
  pan: Coordinate;
};

export type ZoomableCanvasProps = {
  /** Minimum zoom level (default: 0.5) */
  minZoom?: number;
  /** Maximum zoom level (default: 3) */
  maxZoom?: number;
  /** Initial zoom level (default: 1) */
  initialZoom?: number;
  /** Zoom sensitivity (default: 0.001) */
  zoomSensitivity?: number;
  /** Grid dot spacing (default: 15) */
  gridSpacing?: number;
  /** Grid dot size (default: 1.5) */
  dotSize?: number;
  /** Grid dot color */
  dotColor?: string;
  /** Additional className for dots */
  dotClassName?: string;
  /** Display dot grid (default: true) */
  showGrid?: boolean;
  /** Canvas content */
  children: React.ReactNode;
  /** Fixed overlay (not affected by pan/zoom) */
  overlay?: React.ReactNode;
  /** Container className */
  className?: string;
  /** SVG element className */
  svgClassName?: string;
  /** Background color */
  backgroundColor?: string;
  /** Custom error fallback */
  renderError?: ErrorBoundaryProps["fallback"];
};

/**
 * Zoomable and pannable canvas with optional grid pattern.
 * Supports momentum-based panning and mouse wheel zoom.
 *
 * @example
 * ```tsx
 * <ZoomableCanvas
 *   showGrid={true}
 *   dotColor="rgba(100, 100, 100, 0.2)"
 *   overlay={<div className="p-4">Controls</div>}
 * >
 *   <HierarchyView data={tree} ... />
 * </ZoomableCanvas>
 * ```
 */
export function ZoomableCanvas({
  minZoom = ZOOM_MIN_DEFAULT,
  maxZoom = ZOOM_MAX_DEFAULT,
  initialZoom = ZOOM_INITIAL,
  zoomSensitivity = ZOOM_SENSITIVITY,
  gridSpacing = GRID_SPACING_DEFAULT,
  dotSize = DOT_SIZE_DEFAULT,
  dotColor = DOT_COLOR_DEFAULT,
  dotClassName,
  showGrid = true,
  children,
  overlay,
  className,
  svgClassName,
  backgroundColor,
  renderError,
}: ZoomableCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef<Coordinate>({ x: 0, y: 0 });
  const velocity = useRef<Coordinate>({ x: 0, y: 0 });
  const lastPos = useRef<Coordinate>({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);

  const [view, setView] = useState<ViewState>({
    zoom: initialZoom,
    pan: { x: 0, y: 0 },
  });

  const transform = `translate(${view.pan.x},${view.pan.y})scale(${view.zoom})`;

  // Center view on mount
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    setView((prev) => ({
      ...prev,
      pan: { x: rect.width / 2, y: rect.height / 4 },
    }));
  }, []);

  // Momentum animation loop
  const runMomentum = useCallback(() => {
    const vx = velocity.current.x;
    const vy = velocity.current.y;

    if (Math.abs(vx) < VELOCITY_THRESHOLD && Math.abs(vy) < VELOCITY_THRESHOLD) {
      velocity.current = { x: 0, y: 0 };
      rafId.current = null;
      return;
    }

    velocity.current = {
      x: vx * DECAY,
      y: vy * DECAY,
    };

    setView((prev) => ({
      ...prev,
      pan: {
        x: prev.pan.x + velocity.current.x,
        y: prev.pan.y + velocity.current.y,
      },
    }));

    rafId.current = requestAnimationFrame(runMomentum);
  }, []);

  const onPointerDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button !== MAIN_BUTTON) return;

      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }

      dragging.current = true;
      velocity.current = { x: 0, y: 0 };
      lastPos.current = { x: e.clientX, y: e.clientY };
      dragStart.current = {
        x: e.clientX - view.pan.x,
        y: e.clientY - view.pan.y,
      };
    },
    [view.pan]
  );

  const onPointerMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging.current) return;

    velocity.current = {
      x: e.clientX - lastPos.current.x,
      y: e.clientY - lastPos.current.y,
    };

    lastPos.current = { x: e.clientX, y: e.clientY };

    setView((prev) => ({
      ...prev,
      pan: {
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      },
    }));
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;

    dragging.current = false;

    if (
      Math.abs(velocity.current.x) > VELOCITY_THRESHOLD ||
      Math.abs(velocity.current.y) > VELOCITY_THRESHOLD
    ) {
      rafId.current = requestAnimationFrame(runMomentum);
    }
  }, [runMomentum]);

  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // Stop momentum on zoom
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      velocity.current = { x: 0, y: 0 };

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      setView((prev) => {
        const delta = e.deltaY * -zoomSensitivity;
        const newZoom = Math.min(Math.max(minZoom, prev.zoom + delta), maxZoom);

        if (newZoom === prev.zoom) return prev;

        const ratio = newZoom / prev.zoom;
        const newPan = {
          x: mx - (mx - prev.pan.x) * ratio,
          y: my - (my - prev.pan.y) * ratio,
        };

        return { zoom: newZoom, pan: newPan };
      });
    },
    [minZoom, maxZoom, zoomSensitivity]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  // Prevent default wheel behavior
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    svg.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleNativeWheel);
  }, []);

  const containerStyle = className
    ? undefined
    : { position: "relative" as const, width: "100%", height: "100%" };

  const svgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    cursor: "grab",
    ...(backgroundColor ? { backgroundColor } : {}),
  };

  return (
    <div className={className} style={containerStyle}>
      <svg
        ref={svgRef}
        className={svgClassName}
        style={svgStyle}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onWheel={onWheel}
      >
        <g transform={transform}>
          {showGrid && (
            <DotGrid
              spacing={gridSpacing}
              radius={dotSize}
              color={dotColor}
              className={dotClassName}
            />
          )}
          <ErrorBoundary fallback={renderError}>{children}</ErrorBoundary>
        </g>
      </svg>

      {overlay && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{overlay}</div>
      )}
    </div>
  );
}
