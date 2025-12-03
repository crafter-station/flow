"use client";

import {
  ZoomableCanvas,
  HierarchyView,
  Minimap,
  HierarchyGraph,
  useKeyboardNavigation,
  useExport,
  type HierarchyNode,
  type ViewState,
  type DragMode,
  type NodeDragEvent,
  type PositionOverrides,
  type Coordinate,
} from "@crafter-station/flow";
import { useState, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Define custom node type
type FileNode = HierarchyNode & {
  label: string;
  type: "root" | "folder" | "file";
  status?: "active" | "inactive" | "warning";
};

// Sample hierarchy data
const sampleData: FileNode = {
  id: "root",
  label: "Project",
  type: "root",
  status: "active",
  direction: "vertical",
  children: [
    {
      id: "src",
      label: "src",
      type: "folder",
      status: "active",
      direction: "vertical",
      children: [
        {
          id: "components",
          label: "components",
          type: "folder",
          status: "active",
          children: [
            { id: "button", label: "Button.tsx", type: "file", status: "active" },
            { id: "card", label: "Card.tsx", type: "file", status: "active" },
            { id: "input", label: "Input.tsx", type: "file", status: "warning" },
          ],
        },
        {
          id: "lib",
          label: "lib",
          type: "folder",
          status: "active",
          children: [
            { id: "utils", label: "utils.ts", type: "file", status: "active" },
            { id: "hooks", label: "hooks.ts", type: "file", status: "inactive" },
          ],
        },
      ],
    },
    {
      id: "public",
      label: "public",
      type: "folder",
      status: "inactive",
      children: [
        { id: "images", label: "images", type: "folder", status: "inactive" },
        { id: "favicon", label: "favicon.ico", type: "file", status: "active" },
      ],
    },
  ],
};

// Node size resolver
const nodeSize = (node: FileNode) => {
  switch (node.type) {
    case "root":
      return { width: 140, height: 50 };
    case "folder":
      return { width: 160, height: 60 };
    case "file":
      return { width: 150, height: 50 };
    default:
      return { width: 150, height: 50 };
  }
};

// Status colors using CSS variables from shadcn
const statusColors = {
  active: "hsl(var(--chart-2))",
  inactive: "hsl(var(--muted-foreground))",
  warning: "hsl(var(--chart-4))",
};

// Node component
function NodeCard({ node, isSelected }: { node: FileNode; isSelected?: boolean }) {
  const statusColor = statusColors[node.status ?? "active"];

  return (
    <div
      className={`rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md cursor-pointer ${
        isSelected ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{
        width: nodeSize(node).width,
        borderLeft: `3px solid ${statusColor}`,
      }}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {node.type === "root" ? "📁" : node.type === "folder" ? "📂" : "📄"}
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">{node.label}</span>
            <span className="text-xs text-muted-foreground capitalize">
              {node.type}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [view, setView] = useState<ViewState>({ zoom: 1, pan: { x: 0, y: 0 } });
  const [dragMode, setDragMode] = useState<DragMode>("node");
  const [showMinimap, setShowMinimap] = useState(true);
  const [positionOverrides, setPositionOverrides] = useState<PositionOverrides>(() => new Map());
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const graph = useMemo(
    () =>
      new HierarchyGraph<FileNode>({
        gap: { x: 40, y: 60 },
        direction: "vertical",
      }),
    []
  );

  const allNodes = useMemo(() => graph.traverse(sampleData), [graph]);
  for (const node of allNodes) {
    graph.registerSize(node.id, nodeSize(node));
  }
  const layout = useMemo(() => graph.compute(sampleData), [graph]);

  const minimapNodes = useMemo(() => {
    return layout.nodes.map((placed) => ({
      ...placed,
      position: positionOverrides.get(placed.data.id) ?? placed.position,
    }));
  }, [layout.nodes, positionOverrides]);

  const { downloadPng, downloadJsonFile } = useExport({
    svgRef,
    graphResult: layout,
    nodeSize,
  });

  const { containerProps } = useKeyboardNavigation({
    nodes: layout.nodes,
    selectedId: selectedNode?.id ?? null,
    onSelect: (node) => setSelectedNode(node),
    onActivate: (node) => {
      console.log("Activated:", node.label);
    },
  });

  const getSubtreeIds = useCallback((node: FileNode): string[] => {
    const ids: string[] = [node.id];
    if (node.children) {
      for (const child of node.children) {
        ids.push(...getSubtreeIds(child as FileNode));
      }
    }
    return ids;
  }, []);

  const handleDragEnd = useCallback((event: NodeDragEvent<FileNode>) => {
    const affectedIds = dragMode === "subtree"
      ? getSubtreeIds(event.node)
      : [event.node.id];

    setPositionOverrides((prev) => {
      const next = new Map(prev);
      for (const id of affectedIds) {
        const placed = layout.nodes.find((n) => n.data.id === id);
        if (placed) {
          const currentPos = prev.get(id) ?? placed.position;
          next.set(id, {
            x: currentPos.x + event.delta.x,
            y: currentPos.y + event.delta.y,
          });
        }
      }
      return next;
    });
  }, [dragMode, getSubtreeIds, layout.nodes]);

  return (
    <div className="flex h-screen w-full" {...containerProps} ref={containerRef}>
      {/* Sidebar */}
      <div className="w-80 border-r bg-background p-4 flex flex-col gap-4 overflow-y-auto">
        <div>
          <h1 className="text-xl font-bold">@crafter-station/flow</h1>
          <p className="text-sm text-muted-foreground">
            Playground for testing the flow package
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Selected Node</CardTitle>
            <CardDescription>
              {selectedNode ? selectedNode.label : "Click or use arrows"}
            </CardDescription>
          </CardHeader>
          {selectedNode && (
            <CardContent className="text-xs space-y-1">
              <p><strong>ID:</strong> {selectedNode.id}</p>
              <p><strong>Type:</strong> {selectedNode.type}</p>
              <p><strong>Status:</strong> {selectedNode.status}</p>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="drag-mode" className="text-xs">Drag Mode</label>
              <select
                id="drag-mode"
                className="text-xs border rounded px-2 py-1"
                value={dragMode === false ? "off" : dragMode}
                onChange={(e) => {
                  const val = e.target.value;
                  setDragMode(val === "off" ? false : val as DragMode);
                }}
              >
                <option value="node">Node Only</option>
                <option value="subtree">Subtree</option>
                <option value="off">Disabled</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="minimap" className="text-xs">Show Minimap</label>
              <input
                id="minimap"
                type="checkbox"
                checked={showMinimap}
                onChange={(e) => setShowMinimap(e.target.checked)}
                className="h-4 w-4"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => downloadPng("hierarchy.png")}
            >
              Export PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => downloadJsonFile("hierarchy.json")}
            >
              Export JSON
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setSelectedNode(null)}
            >
              Clear Selection
            </Button>
          </CardContent>
        </Card>

        <div className="mt-auto text-xs text-muted-foreground space-y-1">
          <p><strong>Pan:</strong> Click + Drag canvas</p>
          <p><strong>Zoom:</strong> Scroll wheel</p>
          <p><strong>Navigate:</strong> Arrow keys</p>
          <p><strong>Touch:</strong> Pinch to zoom</p>
          {dragMode && <p><strong>Drag:</strong> Drag nodes to move</p>}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-muted/30 relative">
        <ZoomableCanvas
          svgRef={svgRef}
          showGrid={true}
          dotColor="rgba(128, 128, 128, 0.15)"
          backgroundColor="white"
          onViewChange={setView}
        >
          {(viewState) => (
            <HierarchyView<FileNode>
              data={sampleData}
              nodeSize={nodeSize}
              gap={{ x: 40, y: 60 }}
              edgeColor="rgba(100, 100, 100, 0.6)"
              edgeAnimation={{ style: "dots" }}
              renderNode={(node) => (
                <NodeCard
                  node={node}
                  isSelected={selectedNode?.id === node.id}
                />
              )}
              onNodeClick={(node) => setSelectedNode(node)}
              dragMode={dragMode}
              zoom={viewState.zoom}
              selectedNodeId={selectedNode?.id}
              positionOverrides={positionOverrides}
              onNodeDragEnd={handleDragEnd}
            />
          )}
        </ZoomableCanvas>

        {/* Minimap overlay */}
        {showMinimap && (
          <div className="absolute bottom-4 right-4 pointer-events-auto">
            <Minimap
              nodes={minimapNodes}
              nodeSize={nodeSize}
              viewport={{
                pan: view.pan,
                zoom: view.zoom,
                width: canvasSize.width,
                height: canvasSize.height,
              }}
              position="bottom-right"
              backgroundColor="rgba(255, 255, 255, 0.95)"
              nodeColor="rgba(100, 100, 100, 0.5)"
              viewportColor="rgba(59, 130, 246, 0.2)"
              viewportStrokeColor="rgba(59, 130, 246, 0.6)"
            />
          </div>
        )}
      </div>
    </div>
  );
}
