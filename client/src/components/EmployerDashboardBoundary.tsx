import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Component, Fragment, type ErrorInfo, type ReactNode } from "react";
import { Link } from "wouter";
import { ApplicationShell } from "@/components/shell/ZyloShell";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  resetCount: number;
}

type SentryWindow = Window & {
  Sentry?: {
    captureException?: (error: Error, context?: Record<string, unknown>) => void;
  };
};

export default class EmployerDashboardBoundary extends Component<Props, State> {
  state: State = { hasError: false, resetCount: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[EmployerDashboard] Render failure", {
      message: error.message,
      componentStack: info.componentStack,
    });
    (window as SentryWindow).Sentry?.captureException?.(error, {
      tags: { area: "employer-dashboard" },
      extra: { componentStack: info.componentStack },
    });
  }

  private retry = () => {
    this.setState((state) => ({ hasError: false, resetCount: state.resetCount + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <ApplicationShell role="employer">
          <section className="mx-auto flex min-h-[65vh] max-w-2xl items-center justify-center px-4">
            <div className="w-full rounded-3xl border border-rose-500/20 bg-card p-6 text-center shadow-2xl sm:p-10">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-300">
                <AlertTriangle className="h-7 w-7" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">We couldn’t load your dashboard</h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                Your employer workspace hit an unexpected display error. Retry the dashboard or return home while your account and data remain protected.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button onClick={this.retry}><RotateCcw className="mr-2 h-4 w-4" />Retry dashboard</Button>
                <Link href="/"><Button variant="outline"><Home className="mr-2 h-4 w-4" />Return home</Button></Link>
              </div>
            </div>
          </section>
        </ApplicationShell>
      );
    }

    return <Fragment key={this.state.resetCount}>{this.props.children}</Fragment>;
  }
}
