import { Component, type PropsWithChildren, type ReactNode } from "react";
import { NodeContainer } from "./node-container";

export type ErrorBoundaryProps = PropsWithChildren<{
  /**
   * Custom render function for error state.
   * If not provided, displays a default error message.
   *
   * @example
   * ```tsx
   * <ErrorBoundary
   *   fallback={(error, retry) => (
   *     <div>
   *       <p>Error: {error.message}</p>
   *       <button onClick={retry}>Retry</button>
   *     </div>
   *   )}
   * >
   *   {children}
   * </ErrorBoundary>
   * ```
   */
  fallback?: (error: Error, retry: () => void) => ReactNode;
}>;

type State = {
  failed: boolean;
  error: Error | null;
};

/**
 * Error boundary wrapper for canvas content.
 * Catches rendering errors and displays fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { failed: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { failed: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  retry = () => {
    this.setState({ failed: false, error: null });
  };

  render() {
    if (this.state.failed && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }

      return (
        <NodeContainer id="error-fallback" position={{ x: 0, y: 100 }}>
          <div
            style={{
              padding: "16px 24px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              maxWidth: "400px",
            }}
          >
            <div style={{ fontWeight: 600, color: "#991b1b", marginBottom: "8px" }}>
              Rendering Error
            </div>
            <div style={{ fontSize: "14px", color: "#dc2626", marginBottom: "12px" }}>
              {this.state.error.message}
            </div>
            <button
              onClick={this.retry}
              type="button"
              style={{
                padding: "6px 12px",
                background: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#991b1b",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </NodeContainer>
      );
    }

    return this.props.children;
  }
}
