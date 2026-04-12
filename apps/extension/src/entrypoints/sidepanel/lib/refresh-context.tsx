import { Skeleton } from "@workspace/ui/components/skeleton";
import { createContext, type ReactNode, useContext } from "react";

const RefreshContext = createContext(false);

export const RefreshProvider = RefreshContext.Provider;

/** True while a new audit is running and we're still rendering stale data. */
export const useIsRefreshing = () => useContext(RefreshContext);

interface DataSlotProps {
  readonly children?: ReactNode;
  readonly className?: string;
}

/**
 * Renders `children` normally, or a skeleton of the same footprint while the
 * audit is refreshing. Use around data values so surrounding structure stays
 * stable across navigations.
 */
export const DataSlot = ({ children, className }: DataSlotProps) => {
  const refreshing = useIsRefreshing();
  if (refreshing) {
    return (
      <Skeleton className={className ?? "inline-block h-3 w-16 align-middle"} />
    );
  }
  return children;
};
