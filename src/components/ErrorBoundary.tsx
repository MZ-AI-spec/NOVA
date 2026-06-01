import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  appName?: string;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ErrorBoundary caught an error inside [${this.props.appName || 'Unknown App'}]:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div id={`error-boundary-${this.props.appName?.toLowerCase() || 'generic'}`} className="flex flex-col items-center justify-center h-full bg-[#0d0202] text-red-400 p-6 select-none font-mono text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)] pointer-events-none" />
          <div className="relative z-10 space-y-3.5 flex flex-col items-center max-w-[240px]">
            <div className="w-10 h-10 rounded-full border border-red-500/30 flex items-center justify-center bg-red-400/5 text-red-500 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            
            <div className="space-y-1">
              <p className="font-bold uppercase tracking-widest text-[9px] text-red-500">Module Crashed</p>
              <p className="text-[8px] text-white/50 leading-relaxed max-h-12 overflow-y-auto custom-scrollbar">
                {this.state.error?.message || "Render exception or thread panic."}
              </p>
            </div>

            <div className="flex gap-2 w-full mt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-1 px-2 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 active:scale-95 transition-all text-[8px] uppercase tracking-wider font-bold cursor-pointer"
              >
                Reset
              </button>
              {this.props.onClose && (
                <button
                  type="button"
                  onClick={this.props.onClose}
                  className="flex-1 py-1 px-2 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 active:scale-95 transition-all text-[8px] uppercase tracking-wider font-bold cursor-pointer"
                >
                  Close App
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
