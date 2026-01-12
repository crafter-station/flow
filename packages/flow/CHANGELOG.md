# @crafter/flow

## 0.1.1

### Patch Changes

- Fix mobile Safari/Chrome rendering issue where nodes were invisible

  The `foreignObject` elements in `NodeContainer` and `DraggableNodeContainer` were using `width=1 height=1` with `overflow: visible`, which doesn't render properly on mobile browsers. Changed to use explicit 4000x4000 dimensions with proper offset centering to ensure nodes are visible on all devices.
