import { Component, type ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
  readonly onReset: () => void;
}

interface State {
  readonly error: Error | null;
}

/**
 * Contains any error thrown by the lazy share chunk (favicon fetch,
 * canvas draw, rasterize) so a rendering failure can't unmount the
 * whole side panel.
 */
export class ShareErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ShareModal]", error);
  }

  render() {
    if (this.state.error) {
      const dismiss = () => {
        this.setState({ error: null });
        this.props.onReset();
      };
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="max-w-sm rounded-md border border-border bg-background p-4">
            <div className="font-mono text-[10px] text-destructive uppercase tracking-widest">
              Share failed
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              {this.state.error.message}
            </div>
            <button
              className="mt-3 font-mono text-[9px] text-muted-foreground/70 uppercase tracking-wider hover:text-foreground"
              onClick={dismiss}
              type="button"
            >
              Dismiss
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
