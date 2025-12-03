import type {
  Coordinate,
  Dimensions,
  ExportData,
  GraphResult,
  HierarchyNode,
  SizeFn,
} from "../types";

export type ExportOptions = {
  /** Scale factor for PNG export (default: 2 for retina) */
  scale?: number;
  /** Background color for PNG (default: white) */
  backgroundColor?: string;
  /** Padding around content (default: 40) */
  padding?: number;
};

/**
 * Export graph data to JSON format.
 * Includes node positions, sizes, edges, and bounds.
 *
 * @example
 * ```typescript
 * const data = exportToJson(layout, nodeSize);
 * console.log(JSON.stringify(data, null, 2));
 * ```
 */
export function exportToJson<T extends HierarchyNode>(
  result: GraphResult<T>,
  nodeSize: SizeFn<T>
): ExportData<T> {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const nodes = result.nodes.map((placed) => {
    const size = nodeSize(placed.data);

    minX = Math.min(minX, placed.position.x - size.width / 2);
    maxX = Math.max(maxX, placed.position.x + size.width / 2);
    minY = Math.min(minY, placed.position.y - size.height / 2);
    maxY = Math.max(maxY, placed.position.y + size.height / 2);

    return {
      id: placed.data.id,
      data: placed.data,
      position: placed.position,
      size,
    };
  });

  const edges = result.edges.map((edge) => ({
    sourceId: edge.source.id,
    targetId: edge.target.id,
    waypoints: edge.waypoints,
  }));

  // Handle empty graph
  if (nodes.length === 0) {
    minX = maxX = minY = maxY = 0;
  }

  return {
    nodes,
    edges,
    bounds: { minX, maxX, minY, maxY },
  };
}

/**
 * Export SVG element to PNG blob.
 * Handles foreignObject content by cloning and converting.
 *
 * @example
 * ```typescript
 * const blob = await exportToPng(svgElement, { scale: 2 });
 * const url = URL.createObjectURL(blob);
 * // Use url for download or display
 * ```
 */
export async function exportToPng(
  svgElement: SVGSVGElement,
  options: ExportOptions = {}
): Promise<Blob> {
  const { scale = 2, backgroundColor = "#ffffff", padding = 40 } = options;

  // Clone SVG to avoid modifying the original
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Get the bounding box of all content
  const bbox = svgElement.getBBox();

  // Calculate dimensions with padding
  const width = bbox.width + padding * 2;
  const height = bbox.height + padding * 2;

  // Set viewBox to capture all content
  clone.setAttribute("viewBox", `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`);
  clone.setAttribute("width", String(width * scale));
  clone.setAttribute("height", String(height * scale));

  // Remove transforms from the main group to get content coordinates
  const mainGroup = clone.querySelector("g");
  if (mainGroup) {
    mainGroup.removeAttribute("transform");
  }

  // Process foreignObject elements
  const foreignObjects = clone.querySelectorAll("foreignObject");
  for (const fo of foreignObjects) {
    // Replace foreignObject with a placeholder rect
    // Note: Full HTML conversion would require a library like html2canvas
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", fo.getAttribute("x") || "0");
    rect.setAttribute("y", fo.getAttribute("y") || "0");
    rect.setAttribute("width", "100");
    rect.setAttribute("height", "50");
    rect.setAttribute("fill", "rgba(200, 200, 200, 0.8)");
    rect.setAttribute("rx", "4");
    rect.setAttribute("stroke", "rgba(100, 100, 100, 0.5)");
    rect.setAttribute("stroke-width", "1");
    fo.parentNode?.replaceChild(rect, fo);
  }

  // Add XML declaration and namespace
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clone);

  // Ensure proper XML namespace
  if (!svgString.includes("xmlns=")) {
    svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Create blob from SVG
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Create canvas
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Fill background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw SVG
      ctx.drawImage(img, 0, 0);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create PNG blob"));
          }
        },
        "image/png",
        1.0
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG image"));
    };

    img.src = url;
  });
}

/**
 * Trigger a file download in the browser.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download JSON data as a file.
 */
export function downloadJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, filename);
}
