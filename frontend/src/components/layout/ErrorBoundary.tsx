import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, RotateCcw } from "@/components/ui/icons";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught Headwind error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6 text-center select-none">
          <div className="max-w-lg w-full bg-surface border border-risk-severe/30 rounded-panel p-8 backdrop-blur-md shadow-2xl space-y-6 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-risk-severe/15 text-risk-severe border border-risk-severe/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-18 font-bold text-text">Something went wrong</h1>
                <p className="text-12 text-text-muted">
                  A client error interrupted route processing.
                </p>
              </div>
            </div>

            <p className="text-14 text-text-secondary">
              Headwind encountered an unexpected runtime error. You can reload the dispatcher or inspect the technical details below.
            </p>

            {this.state.error && (
              <details className="p-3 bg-bg border border-border rounded-card text-left font-mono text-11 text-text-muted">
                <summary className="cursor-pointer font-semibold text-text hover:text-accent outline-none">
                  Technical Details ({this.state.error.name})
                </summary>
                <div className="mt-2 space-y-2 overflow-x-auto max-h-48">
                  <div className="text-risk-severe">{this.state.error.message}</div>
                  {this.state.error.stack && (
                    <pre className="text-text-muted whitespace-pre-wrap text-10">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={this.handleReset}
                leadingIcon={<RotateCcw className="w-4 h-4" />}
              >
                Reload Dispatcher
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
