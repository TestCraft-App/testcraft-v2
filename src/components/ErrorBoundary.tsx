import { Component, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4">
                    <div className="rounded-lg bg-red-50 p-4">
                        <h2 className="text-sm font-semibold text-red-800">Something went wrong</h2>
                        <p className="mt-1 text-xs text-red-600">{this.state.error?.message}</p>
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="mt-2 rounded bg-red-100 px-3 py-1 text-xs text-red-700 hover:bg-red-200"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
