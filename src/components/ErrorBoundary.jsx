import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Keeps one failing screen from taking the whole app down.
 *
 * Without this, an exception thrown while rendering any tab unmounts the entire
 * React tree, so the app appears dead until a full reload — which is what a
 * missing coordinate on the map used to do to every other tab.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Screen crashed:", error, info?.componentStack);
  }

  componentDidUpdate(previousProps) {
    // A new route means a fresh attempt; clear the last failure.
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-6 w-6 text-amber-700" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-stone-900">
          This screen ran into a problem
        </h1>
        <p className="mt-2 max-w-sm text-sm text-stone-600">
          The rest of the app still works — use the tabs below to keep going, or
          try loading this screen again.
        </p>
        <p className="mt-3 max-w-sm break-words font-mono text-xs text-stone-400">
          {this.state.error?.message}
        </p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }
}
