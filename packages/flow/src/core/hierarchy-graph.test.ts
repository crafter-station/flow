import { describe, expect, test } from "bun:test";
import { HierarchyGraph } from "./hierarchy-graph";
import type { GraphConfig, HierarchyNode } from "../types";

type Node = HierarchyNode & { label?: string };

const SIZE = { width: 100, height: 50 };

function graph(tree: Node, config: Partial<GraphConfig> = {}) {
  const g = new HierarchyGraph<Node>({
    gap: { x: 40, y: 40 },
    direction: "horizontal",
    ...config,
  } as GraphConfig);
  for (const node of g.traverse(tree)) g.registerSize(node.id, SIZE);
  return g;
}

const flat: Node = {
  id: "root",
  children: [{ id: "a" }, { id: "b" }, { id: "c" }],
};

describe("config validation", () => {
  test("missing config names what is required", () => {
    // @ts-expect-error deliberately calling without the required config
    expect(() => new HierarchyGraph()).toThrow(/requires a config object/);
  });

  test("missing gap names the field, not an internal property read", () => {
    // @ts-expect-error deliberately omitting gap
    expect(() => new HierarchyGraph({})).toThrow(/gap: \{ x: number, y: number \}/);
  });
});

describe("traverse", () => {
  test("visits every node of a tree once", () => {
    const ids = graph(flat).traverse(flat).map((n) => n.id);
    expect(ids).toEqual(["root", "a", "b", "c"]);
  });

  test("a node reached twice is listed once", () => {
    const shared: Node = { id: "shared" };
    const dag: Node = {
      id: "root",
      children: [
        { id: "a", children: [shared] },
        { id: "b", children: [shared] },
      ],
    };
    const ids = graph(dag).traverse(dag).map((n) => n.id);
    expect(ids).toEqual(["root", "a", "shared", "b"]);
  });

  test("a cycle terminates instead of overflowing the stack", () => {
    const a: Node = { id: "a" };
    const b: Node = { id: "b", children: [a] };
    a.children = [b];
    expect(graph(a).traverse(a).map((n) => n.id)).toEqual(["a", "b"]);
  });
});

describe("compute", () => {
  test("places every node of the tree", () => {
    const { nodes } = graph(flat).compute(flat);
    expect(nodes).toHaveLength(4);
  });

  test("the root sits at the origin", () => {
    const { nodes } = graph(flat).compute(flat);
    expect(nodes[0]?.position).toEqual({ x: 0, y: 0 });
  });

  test("siblings share a row and spread along it", () => {
    const { nodes } = graph(flat).compute(flat);
    const children = nodes.filter((n) => n.depth === 1);
    const ys = new Set(children.map((n) => n.position.y));
    const xs = children.map((n) => n.position.x);
    expect(ys.size).toBe(1);
    expect(new Set(xs).size).toBe(3);
  });

  test("a cycle does not hang the layout", () => {
    const a: Node = { id: "a" };
    const b: Node = { id: "b", children: [a] };
    a.children = [b];
    expect(graph(a).compute(a).nodes).toHaveLength(2);
  });

  test("a missing size names the node", () => {
    const g = new HierarchyGraph<Node>({ gap: { x: 40, y: 40 } });
    g.registerSize("root", SIZE);
    expect(() => g.compute(flat)).toThrow(/Missing sizes/);
  });
});

describe("direction", () => {
  test("horizontal spreads children across x, vertical stacks them down y", () => {
    const h = graph(flat, { direction: "horizontal" }).compute(flat).nodes;
    const v = graph(flat, { direction: "vertical" }).compute(flat).nodes;

    const spread = (nodes: typeof h, axis: "x" | "y") => {
      const values = nodes.map((n) => n.position[axis]);
      return Math.max(...values) - Math.min(...values);
    };

    expect(spread(h, "x")).toBeGreaterThan(spread(h, "y"));
    expect(spread(v, "y")).toBeGreaterThan(spread(v, "x"));
  });

  test("a node overrides the graph direction for its own children", () => {
    const mixed: Node = {
      id: "root",
      children: [{ id: "a", direction: "vertical", children: [{ id: "a1" }, { id: "a2" }] }],
    };
    const nodes = graph(mixed, { direction: "horizontal" }).compute(mixed).nodes;
    const [a1, a2] = ["a1", "a2"].map((id) => nodes.find((n) => n.data.id === id));
    expect(a1?.position.y).not.toBe(a2?.position.y);
  });
});

describe("edges", () => {
  test("one edge per parent-child link, all marked as tree", () => {
    const { edges } = graph(flat).compute(flat);
    expect(edges).toHaveLength(3);
    expect(edges.every((e) => e.kind === "tree")).toBe(true);
  });

  test("every edge carries a drawable path", () => {
    const { edges } = graph(flat).compute(flat);
    for (const edge of edges) expect(edge.waypoints.length).toBeGreaterThanOrEqual(2);
  });
});

describe("links", () => {
  const withLink = { links: [{ source: "a", target: "c" }] };

  test("a link becomes an edge the tree could not express", () => {
    const { edges } = graph(flat, withLink).compute(flat);
    const cross = edges.filter((e) => e.kind === "cross");
    expect(cross).toHaveLength(1);
    expect(cross[0]?.source.id).toBe("a");
    expect(cross[0]?.target.id).toBe("c");
  });

  test("links never move a node", () => {
    const positions = (config: Partial<GraphConfig>) =>
      graph(flat, config)
        .compute(flat)
        .nodes.map((n) => `${n.data.id}:${n.position.x},${n.position.y}`);

    expect(positions(withLink)).toEqual(positions({}));
  });

  test("a link to a node the layout never placed is skipped, not thrown", () => {
    const { edges } = graph(flat, { links: [{ source: "a", target: "ghost" }] }).compute(flat);
    expect(edges.filter((e) => e.kind === "cross")).toHaveLength(0);
    expect(edges).toHaveLength(3);
  });

  test("a cross edge carries a drawable path", () => {
    const { edges } = graph(flat, withLink).compute(flat);
    const cross = edges.find((e) => e.kind === "cross");
    expect(cross?.waypoints.length).toBeGreaterThanOrEqual(2);
  });

  test("a cross edge bows away from the row it spans", () => {
    const { edges, nodes } = graph(flat, withLink).compute(flat);
    const cross = edges.find((e) => e.kind === "cross");
    const rowY = nodes.find((n) => n.data.id === "a")?.position.y ?? 0;
    const highest = Math.min(...(cross?.waypoints.map((p) => p.y) ?? []));
    expect(highest).toBeLessThan(rowY);
  });

  test("edges spanning different distances bow to different heights", () => {
    const wide: Node = {
      id: "root",
      children: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
    };
    const { edges } = graph(wide, {
      links: [
        { source: "a", target: "b" },
        { source: "a", target: "d" },
      ],
    }).compute(wide);

    const crest = (target: string) => {
      const edge = edges.find((e) => e.kind === "cross" && e.target.id === target);
      return Math.min(...(edge?.waypoints.map((p) => p.y) ?? []));
    };

    expect(crest("d")).toBeLessThan(crest("b"));
  });
});

describe("getSubtreeIds", () => {
  test("returns the node and everything under it", () => {
    const nested: Node = {
      id: "root",
      children: [{ id: "a", children: [{ id: "a1" }] }, { id: "b" }],
    };
    const g = graph(nested);
    const a = nested.children?.[0] as Node;
    expect(g.getSubtreeIds(a)).toEqual(["a", "a1"]);
  });
});
