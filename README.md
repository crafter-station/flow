# @crafter-station/flow

A zero-dependency tree layout and infinite canvas library for React.

## Features

- **Hierarchy Layout Engine** - Pure layout calculation with vertical and horizontal directions
- **Zoomable Canvas** - Pan and zoom with momentum-based scrolling
- **Animated Edges** - Customizable animated paths between nodes
- **Flexible Node Rendering** - Bring your own node components via render props
- **TypeScript First** - Full type safety with generics support
- **Zero Runtime Dependencies** - Only React as a peer dependency

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| [`@crafter-station/flow`](./packages/flow) | Core flow library | 0.1.0 |

## Apps

| App | Description | Port |
|-----|-------------|------|
| [`playground`](./apps/playground) | Interactive playground for testing | 3001 |
| [`www`](./apps/www) | Documentation website | 3000 |

## Getting Started

```bash
# Install dependencies
bun install

# Build the flow package
bun run build

# Start development (all apps)
bun run dev

# Start only playground
bun run dev:playground

# Start only website
bun run dev:www
```

## Quick Example

```tsx
import { ZoomableCanvas, HierarchyView, type HierarchyNode } from "@crafter-station/flow";

type MyNode = HierarchyNode & { label: string };

const data: MyNode = {
  id: "root",
  label: "Root",
  children: [
    { id: "a", label: "Child A" },
    { id: "b", label: "Child B" },
  ],
};

function App() {
  return (
    <ZoomableCanvas>
      <HierarchyView
        data={data}
        nodeSize={() => ({ width: 150, height: 50 })}
        renderNode={(node) => <div>{node.label}</div>}
      />
    </ZoomableCanvas>
  );
}
```

## Tech Stack

- **Monorepo**: Turborepo
- **Package Manager**: Bun
- **Framework**: Next.js 16
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Language**: TypeScript

## License

MIT
