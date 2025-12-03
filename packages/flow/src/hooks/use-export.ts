import { useCallback } from "react";
import type { ExportData, GraphResult, HierarchyNode, SizeFn } from "../types";
import {
  type ExportOptions,
  downloadBlob,
  downloadJson,
  exportToJson,
  exportToPng,
} from "../utils/export";

export type UseExportOptions<T extends HierarchyNode> = {
  /** Reference to the SVG element */
  svgRef: React.RefObject<SVGSVGElement | null>;
  /** Graph layout result */
  graphResult: GraphResult<T>;
  /** Node size function */
  nodeSize: SizeFn<T>;
};

export type UseExportResult<T extends HierarchyNode> = {
  /** Export to PNG and return blob */
  exportPng: (options?: ExportOptions) => Promise<Blob>;
  /** Export to JSON and return data */
  exportJson: () => ExportData<T>;
  /** Export and download PNG file */
  downloadPng: (filename?: string, options?: ExportOptions) => Promise<void>;
  /** Export and download JSON file */
  downloadJsonFile: (filename?: string) => void;
};

/**
 * Hook for exporting canvas content to PNG or JSON.
 *
 * @example
 * ```tsx
 * const svgRef = useRef<SVGSVGElement>(null);
 *
 * const { downloadPng, downloadJsonFile } = useExport({
 *   svgRef,
 *   graphResult: layout,
 *   nodeSize,
 * });
 *
 * return (
 *   <>
 *     <ZoomableCanvas svgRef={svgRef}>...</ZoomableCanvas>
 *     <button onClick={() => downloadPng("my-graph.png")}>Export PNG</button>
 *     <button onClick={() => downloadJsonFile("my-graph.json")}>Export JSON</button>
 *   </>
 * );
 * ```
 */
export function useExport<T extends HierarchyNode>({
  svgRef,
  graphResult,
  nodeSize,
}: UseExportOptions<T>): UseExportResult<T> {
  const exportPngFn = useCallback(
    async (options?: ExportOptions): Promise<Blob> => {
      const svg = svgRef.current;
      if (!svg) {
        throw new Error("SVG element not found");
      }
      return exportToPng(svg, options);
    },
    [svgRef]
  );

  const exportJsonFn = useCallback((): ExportData<T> => {
    return exportToJson(graphResult, nodeSize);
  }, [graphResult, nodeSize]);

  const downloadPngFn = useCallback(
    async (filename = "graph.png", options?: ExportOptions): Promise<void> => {
      const blob = await exportPngFn(options);
      downloadBlob(blob, filename);
    },
    [exportPngFn]
  );

  const downloadJsonFileFn = useCallback(
    (filename = "graph.json"): void => {
      const data = exportJsonFn();
      downloadJson(data, filename);
    },
    [exportJsonFn]
  );

  return {
    exportPng: exportPngFn,
    exportJson: exportJsonFn,
    downloadPng: downloadPngFn,
    downloadJsonFile: downloadJsonFileFn,
  };
}
