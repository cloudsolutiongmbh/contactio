import Sidebar from "@/components/sidebar";
import Loader from "@/components/loader";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import {
	HeadContent,
	Outlet,
	createRootRouteWithContext,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import "../index.css";
import { useOrganization, useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "@contactio/backend/convex/_generated/api";

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
    component: RootComponent,
    head: () => ({
        meta: [
            {
                title: "Contactio – Kontakte verwalten",
            },
            {
                name: "description",
                content: "Contactio.ch – Verwalte alle deine Kontakte einfach und übersichtlich.",
            },
        ],
        links: [
            {
                rel: "icon",
                href: "/favicon.ico",
            },
        ],
    }),
});

function RootComponent() {
	const isFetching = useRouterState({
		select: (s) => s.isLoading,
	});
  const { organization } = useOrganization();
  const { user } = useUser();
  const tenantId = organization?.id ?? (user ? `user:${user.id}` : undefined);
  const tenancyEnabled = (import.meta as any).env?.VITE_TENANCY_ENABLED === '1';
  // Bootstrap membership rows only when tenancy is enabled and backend is deployed.
  if (tenancyEnabled && tenantId) {
    useQuery(api.tenants.me, { tenantId } as any);
  }

	return (
		<>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="light"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<div className="grid h-svh grid-cols-1 md:grid-cols-[14rem_1fr]">
					<Sidebar />
					<div className="min-w-0 overflow-auto">
						{isFetching ? <Loader /> : <Outlet />}
					</div>
				</div>
				<Toaster richColors />
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
		</>
	);
}
