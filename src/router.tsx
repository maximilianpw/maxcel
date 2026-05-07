import { ConvexQueryClient } from '@convex-dev/react-query'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { ConvexProvider } from 'convex/react'
import { routeTree } from './routeTree.gen'
import type { ReactNode } from 'react'

export function getRouter() {
  const convexQueryClient = createConvexQueryClient()
  const queryClient = createQueryClient(convexQueryClient)
  convexQueryClient?.connect(queryClient)

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    context: { queryClient },
    Wrap: ({ children }) => (
      <AppProviders
        queryClient={queryClient}
        convexQueryClient={convexQueryClient}
      >
        {children}
      </AppProviders>
    ),
  })

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
    wrapQueryClient: false,
  })

  return router
}

function createConvexQueryClient() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL
  if (!convexUrl) {
    return null
  }

  return new ConvexQueryClient(convexUrl)
}

function createQueryClient(convexQueryClient: ConvexQueryClient | null) {
  return new QueryClient({
    defaultOptions: convexQueryClient
      ? {
          queries: {
            queryKeyHashFn: convexQueryClient.hashFn(),
            queryFn: convexQueryClient.queryFn(),
          },
        }
      : undefined,
  })
}

function AppProviders({
  queryClient,
  convexQueryClient,
  children,
}: {
  queryClient: QueryClient
  convexQueryClient: ConvexQueryClient | null
  children: ReactNode
}) {
  const content = convexQueryClient ? (
    <ConvexProvider client={convexQueryClient.convexClient}>
      {children}
    </ConvexProvider>
  ) : (
    children
  )

  return (
    <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>
  )
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
