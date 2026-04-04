import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches unexpected React render errors so they don't blank the whole page.
 * Wrap around the app root or individual high-risk sections.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold mb-2">Algo deu errado</h1>
              <p className="text-sm text-muted-foreground">
                Ocorreu um erro inesperado. Tente recarregar a página.
              </p>
              {import.meta.env.DEV && (
                <pre className="mt-4 text-xs text-left bg-muted rounded-lg p-3 overflow-auto max-h-40 text-destructive">
                  {this.state.error.message}
                </pre>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.reset} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </Button>
              <Button onClick={() => window.location.reload()}>
                Recarregar página
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
