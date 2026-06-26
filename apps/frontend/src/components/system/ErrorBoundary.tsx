import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorBoundaryFallback } from "./ErrorBoundaryFallback";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render errors so the app shows a recovery screen instead of a white page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorBoundaryFallback
          message={this.state.error.message}
          onReload={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
