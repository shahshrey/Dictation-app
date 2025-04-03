import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Button } from '../../ui/button';

interface StatsErrorBoundaryProps {
  children: ReactNode;
}

interface StatsErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class StatsErrorBoundary extends Component<
  StatsErrorBoundaryProps,
  StatsErrorBoundaryState
> {
  constructor(props: StatsErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): StatsErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Stats component error:', error, errorInfo);

    // In a production app, this would send to a logging service:
    // logErrorToService(error, errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Statistics Error</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">
              There was a problem loading your dictation statistics.
              {this.state.error && (
                <span className="block text-xs opacity-80 mt-1">{this.state.error.message}</span>
              )}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={this.resetErrorBoundary}>
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
