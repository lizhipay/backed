import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';

interface QueryBoundaryProps<T = unknown> {
  query?: UseQueryResult<T>;
  isLoading?: boolean;
  isError?: boolean;
  /** When true, renders the empty state instead of children. */
  isEmpty?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  children: ReactNode | ((data: T) => ReactNode);
}

/**
 * Renders the right foundation state for a TanStack Query result: loading,
 * error (with retry), empty, or the actual content. Keeps pages declarative.
 */
export function QueryBoundary<T = unknown>({
  query,
  isLoading,
  isError,
  isEmpty,
  onRetry,
  emptyTitle,
  emptyDescription,
  children,
}: QueryBoundaryProps<T>) {
  const loading = query?.isLoading ?? isLoading;
  const error = query?.isError ?? isError;
  const retry = onRetry ?? (query ? () => void query.refetch() : undefined);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;
  if (isEmpty)
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  if (query && typeof children === 'function') {
    if (query.data === undefined || query.data === null) return <EmptyState />;
    return <>{children(query.data)}</>;
  }
  return <>{children}</>;
}
