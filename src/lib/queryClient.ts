import { QueryClient } from "@tanstack/react-query";

// Shared QueryClient for the whole app.
// - staleTime just under the 5s poll interval: remounting a page shows
//   cached data instantly instead of a loading flash, then refetches.
// - no refetch-on-window-focus: avoids surprise refetches mid-demo.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 4_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
