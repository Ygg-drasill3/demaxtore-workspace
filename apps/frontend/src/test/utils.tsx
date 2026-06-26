// apps/frontend/src/test/utils.tsx
//
// Shared test helpers — wraps components in QueryClient + MemoryRouter so
// hooks like useQuery / useNavigate work in isolation.
//
import { type ReactElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";

export function makeTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries:   { retry: false, gcTime: 0, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

interface WrapperOpts {
  route?: string;
  client?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", client = makeTestQueryClient(), ...opts }: WrapperOpts & RenderOptions = {},
): RenderResult & { client: QueryClient } {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  const result = render(ui, { wrapper: Wrapper, ...opts });
  return { ...result, client };
}
