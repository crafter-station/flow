import { useCallback, useEffect, useRef, type PropsWithChildren } from "react";
import type { Coordinate } from "../types";

const DRAG_THRESHOLD = 3;

export type DraggableNodeContainerProps = PropsWithChildren<{
  id: string;
  position: Coordinate;
  draggable: boolean;
  zoom: number;
  selected?: boolean;
  onDragStart?: (id: string) => void;
  onDrag?: (id: string, delta: Coordinate) => void;
  onDragEnd?: (id: string, finalDelta: Coordinate) => void;
  onDragCancel?: (id: string) => void;
}>;

export function DraggableNodeContainer({
  id,
  position,
  draggable,
  zoom,
  selected,
  onDragStart,
  onDrag,
  onDragEnd,
  onDragCancel,
  children,
}: DraggableNodeContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const foreignObjectRef = useRef<SVGForeignObjectElement>(null);

  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const startPos = useRef<Coordinate>({ x: 0, y: 0 });
  const currentDelta = useRef<Coordinate>({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);
  const lastNotifiedDelta = useRef<Coordinate>({ x: 0, y: 0 });

  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const applyVisualTransform = useCallback((delta: Coordinate) => {
    const fo = foreignObjectRef.current;
    if (!fo) return;
    fo.setAttribute("x", String(position.x + delta.x));
    fo.setAttribute("y", String(position.y + delta.y));
  }, [position]);

  const resetVisualTransform = useCallback(() => {
    const fo = foreignObjectRef.current;
    if (!fo) return;
    fo.setAttribute("x", String(position.x));
    fo.setAttribute("y", String(position.y));
  }, [position]);

  const scheduleUpdate = useCallback(() => {
    if (rafId.current !== null) return;

    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      if (!isDragging.current) return;

      const delta = currentDelta.current;
      const dx = Math.abs(delta.x - lastNotifiedDelta.current.x);
      const dy = Math.abs(delta.y - lastNotifiedDelta.current.y);

      if (dx > 0.5 || dy > 0.5) {
        lastNotifiedDelta.current = { ...delta };
        onDrag?.(id, delta);
      }
    });
  }, [id, onDrag]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!draggable) return;
    if (e.button !== 0) return;

    e.stopPropagation();
    e.preventDefault();

    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    isDragging.current = true;
    hasMoved.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    currentDelta.current = { x: 0, y: 0 };
    lastNotifiedDelta.current = { x: 0, y: 0 };

    if (containerRef.current) {
      containerRef.current.style.cursor = "grabbing";
    }
  }, [draggable]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();

    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;

    if (!hasMoved.current) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
        return;
      }
      hasMoved.current = true;
      onDragStart?.(id);
    }

    const canvasDelta = {
      x: dx / zoomRef.current,
      y: dy / zoomRef.current,
    };

    currentDelta.current = canvasDelta;
    applyVisualTransform(canvasDelta);
    scheduleUpdate();
  }, [id, onDragStart, applyVisualTransform, scheduleUpdate]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    isDragging.current = false;

    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }

    if (containerRef.current) {
      containerRef.current.style.cursor = "grab";
    }

    if (hasMoved.current) {
      onDragEnd?.(id, currentDelta.current);
    }

    currentDelta.current = { x: 0, y: 0 };
  }, [id, onDragEnd]);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    isDragging.current = false;
    hasMoved.current = false;

    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }

    resetVisualTransform();

    if (containerRef.current) {
      containerRef.current.style.cursor = "grab";
    }

    onDragCancel?.(id);
  }, [id, onDragCancel, resetVisualTransform]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape" && isDragging.current) {
      isDragging.current = false;
      hasMoved.current = false;

      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }

      resetVisualTransform();

      if (containerRef.current) {
        containerRef.current.style.cursor = "grab";
      }

      onDragCancel?.(id);
    }
  }, [id, onDragCancel, resetVisualTransform]);

  useEffect(() => {
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return (
    <foreignObject
      ref={foreignObjectRef}
      x={position.x}
      y={position.y}
      width={1}
      height={1}
      overflow="visible"
      style={{ willChange: draggable ? "transform" : undefined }}
    >
      <div
        ref={containerRef}
        data-node-id={id}
        data-draggable-node={draggable ? "true" : undefined}
        data-selected={selected ? "true" : undefined}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "translate(-50%, -50%)",
          cursor: draggable ? "grab" : "default",
          userSelect: "none",
          touchAction: "none",
          willChange: draggable ? "transform" : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
        tabIndex={draggable ? 0 : undefined}
      >
        {children}
      </div>
    </foreignObject>
  );
}
