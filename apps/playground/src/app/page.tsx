"use client";

import {
  ZoomableCanvas,
  HierarchyView,
  type HierarchyNode,
} from "@crafter-station/flow";
import { useState } from "react";
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
function NodeCard({ node }: { node: FileNode }) {
  const statusColor = statusColors[node.status ?? "active"];

  return (
    <div
      className="rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md cursor-pointer"
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

  return (
    <div className="flex h-screen w-full">
      {/* Sidebar */}
      <div className="w-80 border-r bg-background p-4 flex flex-col gap-4">
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
              {selectedNode ? selectedNode.label : "Click a node to select"}
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
            <CardTitle className="text-sm">Controls</CardTitle>
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

        <div className="mt-auto text-xs text-muted-foreground">
          <p>Pan: Click + Drag</p>
          <p>Zoom: Scroll wheel</p>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-muted/30">
        <ZoomableCanvas
          showGrid={true}
          dotColor="hsl(var(--muted-foreground) / 0.2)"
          backgroundColor="hsl(var(--background))"
        >
          <HierarchyView<FileNode>
            data={sampleData}
            nodeSize={nodeSize}
            gap={{ x: 40, y: 60 }}
            edgeColor="hsl(var(--muted-foreground) / 0.5)"
            edgeAnimation={{ style: "dots" }}
            renderNode={(node) => <NodeCard node={node} />}
            onNodeClick={(node) => setSelectedNode(node)}
          />
        </ZoomableCanvas>
      </div>
    </div>
  );
}
