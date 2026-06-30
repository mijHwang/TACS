import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

const RED = '#D82D31';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Diagnóstico en consola; el usuario ya ve el fallback con reintento.
    console.error('ErrorBoundary capturó un error:', error, info);
  }

  private handleRetry = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-4 h-screen w-screen bg-white text-center px-6"
        >
          <p className="text-lg font-bold" style={{ color: RED }}>
            Algo salió mal.
          </p>
          <p className="text-sm text-gray-500 max-w-md">
            Ocurrió un error inesperado. Podés reintentar; si persiste, recargá la página.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-6 py-2 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: RED }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
