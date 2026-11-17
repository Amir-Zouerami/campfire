import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type ErrorBoundaryProps = {
	/** Renders the fallback; receives the error so it can be reported. */
	readonly fallback: (error: Error, reset: () => void) => ReactNode;
	readonly children: ReactNode;
};

type ErrorBoundaryState = { readonly error: Error | null };

/**
 * ErrorBoundary contains a render crash to one region so a bug on one page never takes down
 * the whole Campfire window. (Error boundaries must be class components.)
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	public override state: ErrorBoundaryState = { error: null };

	public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { error };
	}

	public override componentDidCatch(error: Error, info: ErrorInfo): void {
		console.error('Campfire page crashed', error, info.componentStack);
	}

	public override render(): ReactNode {
		if (this.state.error !== null) {
			return this.props.fallback(this.state.error, () => this.setState({ error: null }));
		}

		return this.props.children;
	}
}
